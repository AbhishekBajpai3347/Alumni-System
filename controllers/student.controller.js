const db = require('../config/db');

async function getStudentProfile(userId) {
  const res = await db.query(
    `SELECT sp.*, d.name AS branch
     FROM student_profiles sp LEFT JOIN departments d ON d.id = sp.department_id
     WHERE sp.user_id = $1`,
    [userId]
  );
  if (res.rows.length === 0) return null;
  const profile = res.rows[0];
  const interestsRes = await db.query(
    `SELECT i.name FROM student_interests si JOIN interests i ON i.id = si.interest_id WHERE si.student_id = $1`,
    [profile.id]
  );
  profile.interests = interestsRes.rows.map((r) => r.name);
  return profile;
}

/** Home page (section 3): welcome, insights snapshot, recommended alumni, quick stats, recent advice. */
async function renderHome(req, res) {
  try {
    const statsRes = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM alumni_profiles) AS total_alumni,
        (SELECT COUNT(*) FROM student_profiles) AS total_students,
        (SELECT COUNT(DISTINCT company_id) FROM alumni_profiles WHERE company_id IS NOT NULL) AS total_companies,
        (SELECT COUNT(*) FROM advice_questions) AS total_questions
    `);
    const stats = statsRes.rows[0];

    const recommendedRes = await db.query(`
      SELECT ap.id, ap.name, ap.job_role, c.name AS company_name, ap.location, ap.graduation_year
      FROM alumni_profiles ap LEFT JOIN companies c ON c.id = ap.company_id
      WHERE ap.mentorship_available = true
      ORDER BY ap.created_at DESC LIMIT 4
    `);

    const recentAdviceRes = await db.query(`
      SELECT aa.answer, aq.question, ap.name AS alumni_name
      FROM alumni_advice aa
      JOIN advice_questions aq ON aq.id = aa.question_id
      JOIN alumni_profiles ap ON ap.id = aa.alumni_id
      ORDER BY aa.created_at DESC LIMIT 3
    `);

    const topSkillsRes = await db.query(`
      SELECT s.name, COUNT(*) AS cnt
      FROM alumni_skills als JOIN skills s ON s.id = als.skill_id
      GROUP BY s.name ORDER BY cnt DESC LIMIT 5
    `);

    res.render('student/dashboard', {
      stats,
      recommended: recommendedRes.rows,
      recentAdvice: recentAdviceRes.rows,
      topSkills: topSkillsRes.rows,
    });
  } catch (err) {
    console.error('[student] renderHome error:', err);
    res.status(500).send('Failed to load home page.');
  }
}

async function editProfileForm(req, res) {
  const profile = await getStudentProfile(req.user.id);
  res.render('student/edit-profile', { profile, error: null });
}

async function updateProfile(req, res) {
  const { name, year, graduation_year, branch, interests } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    let deptId = null;
    if (branch) {
      const deptRes = await client.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [branch]
      );
      deptId = deptRes.rows[0].id;
    }

    const spRes = await client.query(
      `UPDATE student_profiles SET name = $1, year = $2, graduation_year = $3, department_id = $4, updated_at = now()
       WHERE user_id = $5 RETURNING id`,
      [name, year || null, graduation_year || null, deptId, req.user.id]
    );
    const studentId = spRes.rows[0].id;

    await client.query('DELETE FROM student_interests WHERE student_id = $1', [studentId]);
    const interestList = (interests || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const interestName of interestList) {
      const intRes = await client.query(
        `INSERT INTO interests (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [interestName]
      );
      await client.query(
        `INSERT INTO student_interests (student_id, interest_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [studentId, intRes.rows[0].id]
      );
    }

    await client.query('COMMIT');
    res.redirect('/student/profile');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[student] updateProfile error:', err);
    const profile = await getStudentProfile(req.user.id);
    res.render('student/edit-profile', { profile, error: 'Failed to update profile.' });
  } finally {
    client.release();
  }
}

async function viewProfile(req, res) {
  const profile = await getStudentProfile(req.user.id);
  res.render('student/profile', { profile });
}

module.exports = { renderHome, editProfileForm, updateProfile, viewProfile, getStudentProfile };
