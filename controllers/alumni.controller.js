const db = require('../config/db');
const { syncAlumniVector } = require('../services/qdrant.service');

const SURVEY_QUESTIONS = require('../data/survey-questions');

// ---------- Alumni Finder (structured, PostgreSQL only -- section 4) ----------

async function finderPage(req, res) {
  const { name, graduation_year, branch, company, skills, location } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  let sql = `
    SELECT ap.id, ap.name, ap.job_role, ap.location, ap.graduation_year,
           c.name AS company_name, d.name AS department_name,
           COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS skills
    FROM alumni_profiles ap
    LEFT JOIN companies c ON c.id = ap.company_id
    LEFT JOIN departments d ON d.id = ap.department_id
    LEFT JOIN alumni_skills als ON als.alumni_id = ap.id
    LEFT JOIN skills s ON s.id = als.skill_id
  `;

  if (name) { conditions.push(`ap.name ILIKE $${idx++}`); params.push(`%${name}%`); }
  if (graduation_year) { conditions.push(`ap.graduation_year = $${idx++}`); params.push(graduation_year); }
  if (branch) { conditions.push(`d.name ILIKE $${idx++}`); params.push(`%${branch}%`); }
  if (company) { conditions.push(`c.name ILIKE $${idx++}`); params.push(`%${company}%`); }
  if (location) { conditions.push(`ap.location ILIKE $${idx++}`); params.push(`%${location}%`); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' GROUP BY ap.id, c.name, d.name';

  if (skills) {
    sql += ` HAVING EXISTS (
      SELECT 1 FROM alumni_skills als2 JOIN skills s2 ON s2.id = als2.skill_id
      WHERE als2.alumni_id = ap.id AND s2.name ILIKE $${idx++}
    )`;
    params.push(`%${skills}%`);
  }

  sql += ' ORDER BY ap.name ASC LIMIT 50';

  try {
    const result = await db.query(sql, params);
    res.render('alumni/dashboard', { results: result.rows, query: req.query });
  } catch (err) {
    console.error('[alumni] finderPage error:', err);
    res.render('alumni/dashboard', { results: [], query: req.query, error: 'Search failed. Please try again.' });
  }
}

// ---------- Alumni Profile ----------

async function getFullProfile(alumniId) {
  const profileRes = await db.query(
    `SELECT ap.*, c.name AS company_name, d.name AS department_name
     FROM alumni_profiles ap
     LEFT JOIN companies c ON c.id = ap.company_id
     LEFT JOIN departments d ON d.id = ap.department_id
     WHERE ap.id = $1`,
    [alumniId]
  );
  if (profileRes.rows.length === 0) return null;
  const profile = profileRes.rows[0];

  const [skillsRes, interestsRes, journeyRes, adviceRes] = await Promise.all([
    db.query(`SELECT s.name FROM alumni_skills als JOIN skills s ON s.id = als.skill_id WHERE als.alumni_id = $1`, [alumniId]),
    db.query(`SELECT i.name FROM alumni_interests ai JOIN interests i ON i.id = ai.interest_id WHERE ai.alumni_id = $1`, [alumniId]),
    db.query(
      `SELECT cj.*, c.name AS company_name FROM career_journeys cj LEFT JOIN companies c ON c.id = cj.company_id
       WHERE cj.alumni_id = $1 ORDER BY cj.start_date ASC NULLS LAST`,
      [alumniId]
    ),
    db.query(
      `SELECT aa.answer, aa.created_at, aq.question FROM alumni_advice aa
       JOIN advice_questions aq ON aq.id = aa.question_id WHERE aa.alumni_id = $1 ORDER BY aa.created_at DESC`,
      [alumniId]
    ),
  ]);

  profile.skills = skillsRes.rows.map((r) => r.name);
  profile.interests = interestsRes.rows.map((r) => r.name);
  profile.journey = journeyRes.rows;
  profile.advice = adviceRes.rows;
  return profile;
}

async function viewAlumniProfile(req, res) {
  const profile = await getFullProfile(req.params.id);
  if (!profile) return res.status(404).send('Alumni not found');
  const isOwner = !!(req.user && req.user.role === 'alumni' && profile.user_id === req.user.id);
  res.render('alumni/profile', { profile, isOwner });
}

async function getAlumniIdForUser(userId) {
  const res = await db.query('SELECT id FROM alumni_profiles WHERE user_id = $1', [userId]);
  return res.rows.length ? res.rows[0].id : null;
}

async function viewOwnProfile(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const profile = await getFullProfile(alumniId);
  res.render('alumni/profile', { profile, isOwner: true });
}

async function editProfileForm(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const profile = await getFullProfile(alumniId);
  res.render('alumni/edit-profile', { profile, error: null });
}

async function updateProfile(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const {
    name, branch, graduation_year, company, job_role, location, bio,
    linkedin_url, github_url, experience_years, skills, interests,
    mentorship_available, referral_available,
  } = req.body;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    let deptId = null;
    if (branch) {
      const r = await client.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [branch]
      );
      deptId = r.rows[0].id;
    }
    let companyId = null;
    if (company) {
      const r = await client.query(
        `INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [company]
      );
      companyId = r.rows[0].id;
    }

    await client.query(
      `UPDATE alumni_profiles SET name=$1, department_id=$2, graduation_year=$3, company_id=$4, job_role=$5,
       location=$6, bio=$7, linkedin_url=$8, github_url=$9, experience_years=$10,
       mentorship_available=$11, referral_available=$12, updated_at=now()
       WHERE id = $13`,
      [name, deptId, graduation_year || null, companyId, job_role || null, location || null, bio || null,
        linkedin_url || null, github_url || null, experience_years || null,
        mentorship_available === 'on', referral_available === 'on', alumniId]
    );

    await client.query('DELETE FROM alumni_skills WHERE alumni_id = $1', [alumniId]);
    for (const skillName of (skills || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      const r = await client.query(
        `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [skillName]
      );
      await client.query(`INSERT INTO alumni_skills (alumni_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [alumniId, r.rows[0].id]);
    }

    await client.query('DELETE FROM alumni_interests WHERE alumni_id = $1', [alumniId]);
    for (const interestName of (interests || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      const r = await client.query(
        `INSERT INTO interests (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [interestName]
      );
      await client.query(`INSERT INTO alumni_interests (alumni_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [alumniId, r.rows[0].id]);
    }

    await client.query('COMMIT');

    // Section 7: any semantically-relevant change must resync the Qdrant vector.
    syncAlumniVector(alumniId).catch((e) => console.error('[qdrant] sync after profile update failed:', e.message));

    res.redirect('/alumni/profile');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[alumni] updateProfile error:', err);
    const profile = await getFullProfile(alumniId);
    res.render('alumni/edit-profile', { profile, error: 'Failed to update profile.' });
  } finally {
    client.release();
  }
}

// ---------- Career Journey ----------

async function careerPage(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const profile = await getFullProfile(alumniId);
  res.render('alumni/career', { profile, error: null });
}

async function addCareerEntry(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const { company, role, start_date, end_date, description } = req.body;
  try {
    let companyId = null;
    if (company) {
      const r = await db.query(
        `INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [company]
      );
      companyId = r.rows[0].id;
    }
    await db.query(
      `INSERT INTO career_journeys (alumni_id, company_id, role, start_date, end_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [alumniId, companyId, role, start_date || null, end_date || null, description || null]
    );
    syncAlumniVector(alumniId).catch((e) => console.error('[qdrant] sync after career add failed:', e.message));
    res.redirect('/alumni/career');
  } catch (err) {
    console.error('[alumni] addCareerEntry error:', err);
    const profile = await getFullProfile(alumniId);
    res.render('alumni/career', { profile, error: 'Failed to add career entry.' });
  }
}

async function deleteCareerEntry(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  try {
    await db.query('DELETE FROM career_journeys WHERE id = $1 AND alumni_id = $2', [req.params.entryId, alumniId]);
    syncAlumniVector(alumniId).catch((e) => console.error('[qdrant] sync after career delete failed:', e.message));
  } catch (err) {
    console.error('[alumni] deleteCareerEntry error:', err);
  }
  res.redirect('/alumni/career');
}

// ---------- Alumni Onboarding Survey (section 14) ----------

async function surveyPage(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const existingRes = await db.query('SELECT question_no, answer_json FROM alumni_survey_responses WHERE alumni_id = $1', [alumniId]);
  const existing = {};
  existingRes.rows.forEach((r) => { existing[r.question_no] = r.answer_json; });
  res.render('alumni/survey', { questions: SURVEY_QUESTIONS, existing, error: null });
}

// Survey questions whose answers map directly onto the alumni_skills /
// alumni_interests tables the profile page and Alumni Finder read from.
// Without this, a fresh alumni's Skills/Interests/Career Journey sections
// stayed empty even after finishing the whole survey -- the answers were
// only ever saved as free text in alumni_survey_responses, never reaching
// the structured tables the rest of the UI displays.
// (Career journey isn't auto-populated here: the survey only captures a
// single first-job role with no company/dates, so fabricating a journey
// entry from it would misrepresent real data -- alumni add that via the
// dedicated Career Journey page instead.)
const SKILL_QUESTION_NOS = [7, 8];   // programming languages, technical areas
const INTEREST_QUESTION_NOS = [4, 5]; // academic subjects, outside-field interests

async function submitSurvey(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const q of SURVEY_QUESTIONS) {
      const key = `q${q.no}`;
      let value = req.body[key];
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        // multi-select
      } else if (q.type === 'integer') {
        value = value === '' ? null : parseInt(value, 10);
      }
      await client.query(
        `INSERT INTO alumni_survey_responses (alumni_id, question_no, answer_json)
         VALUES ($1, $2, $3)
         ON CONFLICT (alumni_id, question_no) DO UPDATE SET answer_json = EXCLUDED.answer_json, updated_at = now()`,
        [alumniId, q.no, JSON.stringify(value)]
      );

      // Mirror relevant multi-select answers into the structured
      // skills/interests tables so the profile page and Alumni Finder
      // reflect them immediately, not just the raw survey record.
      const values = Array.isArray(value) ? value : (value ? [value] : []);
      if (SKILL_QUESTION_NOS.includes(q.no)) {
        for (const skillName of values) {
          const r = await client.query(
            `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
            [skillName]
          );
          await client.query(
            `INSERT INTO alumni_skills (alumni_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [alumniId, r.rows[0].id]
          );
        }
      }
      if (INTEREST_QUESTION_NOS.includes(q.no)) {
        for (const interestName of values) {
          const r = await client.query(
            `INSERT INTO interests (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
            [interestName]
          );
          await client.query(
            `INSERT INTO alumni_interests (alumni_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [alumniId, r.rows[0].id]
          );
        }
      }
    }
    await client.query('UPDATE alumni_profiles SET onboarding_completed = true WHERE id = $1', [alumniId]);
    await client.query('COMMIT');

    syncAlumniVector(alumniId).catch((e) => console.error('[qdrant] sync after survey submit failed:', e.message));

    res.redirect('/');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[alumni] submitSurvey error:', err);
    res.render('alumni/survey', { questions: SURVEY_QUESTIONS, existing: {}, error: 'Failed to save survey. Please try again.' });
  } finally {
    client.release();
  }
}

async function skipSurvey(req, res) {
  const alumniId = await getAlumniIdForUser(req.user.id);
  try {
    await db.query('UPDATE alumni_profiles SET onboarding_completed = true WHERE id = $1', [alumniId]);
    res.redirect('/');
  } catch (err) {
    console.error('[alumni] skipSurvey error:', err);
    res.redirect('/');
  }
}

module.exports = {
  finderPage, viewAlumniProfile, viewOwnProfile, editProfileForm, updateProfile,
  careerPage, addCareerEntry, deleteCareerEntry, surveyPage, submitSurvey, skipSurvey,
  getFullProfile, getAlumniIdForUser,
};
