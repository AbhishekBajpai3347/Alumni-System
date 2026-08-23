const db = require('../config/db');

async function insightsPage(req, res) {
  try {
    const [careerDist, topSkills, topCompanies, gradYearDist] = await Promise.all([
      db.query(`
        SELECT COALESCE(job_role, 'Unspecified') AS role, COUNT(*)::int AS count
        FROM alumni_profiles GROUP BY job_role ORDER BY count DESC LIMIT 10
      `),
      db.query(`
        SELECT s.name, COUNT(*)::int AS count
        FROM alumni_skills als JOIN skills s ON s.id = als.skill_id
        GROUP BY s.name ORDER BY count DESC LIMIT 10
      `),
      db.query(`
        SELECT c.name, COUNT(*)::int AS count
        FROM alumni_profiles ap JOIN companies c ON c.id = ap.company_id
        GROUP BY c.name ORDER BY count DESC LIMIT 10
      `),
      db.query(`
        SELECT graduation_year, COUNT(*)::int AS count
        FROM alumni_profiles WHERE graduation_year IS NOT NULL
        GROUP BY graduation_year ORDER BY graduation_year ASC
      `),
    ]);

    res.render('analytics/dashboard', {
      careerDist: careerDist.rows,
      topSkills: topSkills.rows,
      topCompanies: topCompanies.rows,
      gradYearDist: gradYearDist.rows,
    });
  } catch (err) {
    console.error('[analytics] insightsPage error:', err);
    res.status(500).send('Failed to load insights.');
  }
}

module.exports = { insightsPage };
