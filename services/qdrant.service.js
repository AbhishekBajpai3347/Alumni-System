const { client, COLLECTION_NAME } = require('../config/qdrant');
const { generateEmbedding } = require('./embedding.service');
const db = require('../config/db');

/**
 * Builds a single consolidated text representation of an alumnus from
 * profile info, skills, interests, career journey, survey answers and
 * advice -- this is what gets embedded and stored in Qdrant (section 6 of spec).
 */
async function buildAlumniDocument(alumniId) {
  const profileRes = await db.query(
    `SELECT ap.*, d.name AS department_name, c.name AS company_name
     FROM alumni_profiles ap
     LEFT JOIN departments d ON d.id = ap.department_id
     LEFT JOIN companies c ON c.id = ap.company_id
     WHERE ap.id = $1`,
    [alumniId]
  );
  console.log(profileRes)
  if (profileRes.rows.length === 0) return null;
  const p = profileRes.rows[0];

  const skillsRes = await db.query(
    `SELECT s.name FROM alumni_skills als JOIN skills s ON s.id = als.skill_id WHERE als.alumni_id = $1`,
    [alumniId]
  );
  const interestsRes = await db.query(
    `SELECT i.name FROM alumni_interests ai JOIN interests i ON i.id = ai.interest_id WHERE ai.alumni_id = $1`,
    [alumniId]
  );
  const journeyRes = await db.query(
    `SELECT cj.role, c.name AS company_name, cj.description
     FROM career_journeys cj LEFT JOIN companies c ON c.id = cj.company_id
     WHERE cj.alumni_id = $1 ORDER BY cj.start_date ASC`,
    [alumniId]
  );
  const surveyRes = await db.query(
    `SELECT question_no, answer_json FROM alumni_survey_responses WHERE alumni_id = $1`,
    [alumniId]
  );
  const adviceRes = await db.query(
    `SELECT answer FROM alumni_advice WHERE alumni_id = $1`,
    [alumniId]
  );

  const skills = skillsRes.rows.map((r) => r.name).join(', ');
  const interests = interestsRes.rows.map((r) => r.name).join(', ');
  const journey = journeyRes.rows
    .map((r) => `${r.role} at ${r.company_name || 'N/A'}${r.description ? ` (${r.description})` : ''}`)
    .join('. ');
  const surveyText = surveyRes.rows
    .map((r) => {
      let val = r.answer_json;
      try {
        val = typeof val === 'string' ? val : JSON.stringify(val);
      } catch (e) { /* ignore */ }
      return Array.isArray(val) ? val.join(', ') : String(val).replace(/"/g, '');
    })
    .join('. ');
  const adviceText = adviceRes.rows.map((r) => r.answer).join(' ');

  const doc = [
    `Name: ${p.name}.`,
    `Role: ${p.job_role || 'N/A'} at ${p.company_name || 'N/A'}.`,
    `Department: ${p.department_name || 'N/A'}, Graduation Year: ${p.graduation_year || 'N/A'}.`,
    `Location: ${p.location || 'N/A'}.`,
    p.bio ? `Bio: ${p.bio}.` : '',
    skills ? `Skills: ${skills}.` : '',
    interests ? `Interests: ${interests}.` : '',
    journey ? `Career journey: ${journey}.` : '',
    surveyText ? `Survey insights: ${surveyText}.` : '',
    adviceText ? `Advice given: ${adviceText}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return doc;
}

/**
 * Regenerates the embedding for an alumnus and upserts their Qdrant point.
 * Called on: alumni onboarding completion, profile edits, survey updates,
 * career journey edits, advice submission (see section 7 of spec).
 */
async function syncAlumniVector(alumniId) {
  const doc = await buildAlumniDocument(alumniId);
  if (!doc) return;

  const vector = await generateEmbedding(doc);

  await client.upsert(COLLECTION_NAME, {
    points: [
      {
        id: alumniId,
        vector,
        payload: { alumni_id: alumniId },
      },
    ],
  });

  await db.query('UPDATE alumni_profiles SET qdrant_synced_at = now() WHERE id = $1', [alumniId]);
}

/**
 * Runs a semantic search against Qdrant given free-text (already the
 * semantic portion of a student's query) and returns [{alumni_id, score}].
 */
async function semanticSearch(queryText, limit = 10) {
  const vector = await generateEmbedding(queryText);
  const results = await client.query(COLLECTION_NAME, {
    vector,
    limit,
    with_payload: true,
  });
  return results.points.map((r) => ({ alumni_id: r.payload.alumni_id, score: r.score }));
}

async function deleteAlumniVector(alumniId) {
  await client.delete(COLLECTION_NAME, { points: [alumniId] });
}

module.exports = { buildAlumniDocument, syncAlumniVector, semanticSearch, deleteAlumniVector };
