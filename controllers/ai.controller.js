const db = require('../config/db');
const { extractStructuredRequirements, explainMatch } = require('../services/ai.service');
const { semanticSearch, MIN_SCORE } = require('../services/qdrant.service');

function finderPage(req, res) {
  res.render('ai/finder');
}

/**
 * Raw cosine similarity from this embedding model clusters in a narrow high
 * band for this domain (every alumni document shares the same "Name: ...
 * Role: ... Department: ..." template, so that boilerplate dominates the
 * vector and pushes *all* similarities up) -- e.g. realistically ~0.40 (weak)
 * to ~0.90 (excellent) rather than the full 0-1 range. Multiplying the raw
 * score by 100 directly made nearly everything read as "100% match".
 * This rescales [MIN_SCORE, MAX_SCORE] -> [0, 100] so the displayed
 * percentage actually discriminates between weak and strong matches.
 * Configurable since the right ceiling depends on the embedding model.
 */
const MAX_SCORE = parseFloat(process.env.SEMANTIC_MATCH_MAX_SCORE || '0.90');

function toMatchPercent(rawScore) {
  const clamped = Math.min(Math.max(rawScore, MIN_SCORE), MAX_SCORE);
  const pct = ((clamped - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

/**
 * POST /ai/finder/search  (called via fetch from public/js/ai-finder.js)
 * Implements the full flow described in section 5 of the spec:
 * 1. Groq extracts structured requirements from the free-text query.
 * 2. Structured requirements are used for hard filtering (WHERE clause).
 * 3. An embedding of the query is searched against Qdrant for semantic matches.
 * 4. Full alumni records are fetched from PostgreSQL (source of truth).
 * 5. Results are merged, scored, and returned with a match explanation.
 */
async function search(req, res) {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Please describe what kind of alumnus you are looking for.' });
  }

  let structured;
  try {
    structured = await extractStructuredRequirements(query);
  } catch (err) {
    console.error('[ai] Groq extraction failed:', err.message);
    return res.status(503).json({
      error: 'The AI matching service (Groq) is currently unavailable. Please try the regular Alumni Finder instead, or try again shortly.',
    });
  }

  let semanticHits;
  try {
    semanticHits = await semanticSearch(query, 15);
  } catch (err) {
    console.error('[ai] Qdrant semantic search failed:', err.message);
    return res.status(503).json({
      error: 'The semantic search service (Qdrant) is currently unavailable. Please try the regular Alumni Finder instead, or try again shortly.',
      structured,
    });
  }

  if (semanticHits.length === 0) {
    return res.json({ structured, results: [] });
  }

  const alumniIds = semanticHits.map((h) => h.alumni_id);

  try {
    // Structured hard-filters applied on top of the semantically retrieved candidates.
    const conditions = [`ap.id = ANY($1::int[])`];
    const params = [alumniIds];
    let idx = 2;

    if (structured.graduation_year) {
      conditions.push(`ap.graduation_year = $${idx++}`);
      params.push(structured.graduation_year);
    }
    if (structured.branch) {
      conditions.push(`d.name ILIKE $${idx++}`);
      params.push(`%${structured.branch}%`);
    }

    const sql = `
      SELECT ap.id, ap.name, ap.job_role, ap.location, ap.graduation_year, ap.bio,
             c.name AS company_name, d.name AS department_name,
             COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS skills
      FROM alumni_profiles ap
      LEFT JOIN companies c ON c.id = ap.company_id
      LEFT JOIN departments d ON d.id = ap.department_id
      LEFT JOIN alumni_skills als ON als.alumni_id = ap.id
      LEFT JOIN skills s ON s.id = als.skill_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY ap.id, c.name, d.name
    `;
    const dbResult = await db.query(sql, params);
    const byId = {};
    dbResult.rows.forEach((r) => { byId[r.id] = r; });

    // Preserve Qdrant relevance ordering; drop any candidates filtered out or missing.
    const merged = semanticHits
      .filter((h) => byId[h.alumni_id])
      .slice(0, 10)
      .map((h) => ({ ...byId[h.alumni_id], match_score: toMatchPercent(h.score) }));

    // Generate short "why matched" explanations (best-effort, non-blocking on failure).
    const withExplanations = await Promise.all(
      merged.map(async (alum) => {
        const summary = `${alum.name}, ${alum.job_role || 'N/A'} at ${alum.company_name || 'N/A'}, skills: ${(alum.skills || []).join(', ') || 'N/A'}, location: ${alum.location || 'N/A'}.`;
        const why = await explainMatch(query, summary);
        return { ...alum, why_matched: why };
      })
    );

    res.json({ structured, results: withExplanations });
  } catch (err) {
    console.error('[ai] PostgreSQL enrichment failed:', err);
    res.status(500).json({ error: 'Something went wrong while fetching alumni records.' });
  }
}

module.exports = { finderPage, search };
