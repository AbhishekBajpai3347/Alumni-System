const db = require('../config/db');
const { syncAlumniVector } = require('../services/qdrant.service');

async function advicePage(req, res) {
  try {
    const questionsRes = await db.query(`
      SELECT aq.id, aq.question, aq.created_at, sp.name AS student_name
      FROM advice_questions aq JOIN student_profiles sp ON sp.id = aq.student_id
      ORDER BY aq.created_at DESC LIMIT 50
    `);
    const questions = questionsRes.rows;

    for (const q of questions) {
      const answersRes = await db.query(`
        SELECT aa.id, aa.answer, aa.created_at, aa.updated_at, ap.id AS alumni_id, ap.name AS alumni_name
        FROM alumni_advice aa JOIN alumni_profiles ap ON ap.id = aa.alumni_id
        WHERE aa.question_id = $1 ORDER BY aa.created_at ASC
      `, [q.id]);
      q.answers = answersRes.rows;
    }

    let myAlumniId = null;
    if (req.user && req.user.role === 'alumni') {
      const r = await db.query('SELECT id FROM alumni_profiles WHERE user_id = $1', [req.user.id]);
      if (r.rows.length) myAlumniId = r.rows[0].id;
    }

    res.render('advice/index', { questions, myAlumniId, error: null });
  } catch (err) {
    console.error('[advice] advicePage error:', err);
    res.status(500).send('Failed to load advice page.');
  }
}

async function postQuestion(req, res) {
  const { question } = req.body;
  try {
    const spRes = await db.query('SELECT id FROM student_profiles WHERE user_id = $1', [req.user.id]);
    if (!spRes.rows.length) return res.status(403).send('Only students can post questions.');
    await db.query('INSERT INTO advice_questions (student_id, question) VALUES ($1, $2)', [spRes.rows[0].id, question]);
    res.redirect('/advice');
  } catch (err) {
    console.error('[advice] postQuestion error:', err);
    res.redirect('/advice');
  }
}

async function postAnswer(req, res) {
  const { answer } = req.body;
  const { questionId } = req.params;
  try {
    const apRes = await db.query('SELECT id FROM alumni_profiles WHERE user_id = $1', [req.user.id]);
    if (!apRes.rows.length) return res.status(403).send('Only alumni can answer questions.');
    const alumniId = apRes.rows[0].id;

    await db.query('INSERT INTO alumni_advice (question_id, alumni_id, answer) VALUES ($1, $2, $3)', [questionId, alumniId, answer]);

    // Advice is part of the semantic document (section 6), so resync.
    syncAlumniVector(alumniId).catch((e) => console.error('[qdrant] sync after advice answer failed:', e.message));

    res.redirect('/advice');
  } catch (err) {
    console.error('[advice] postAnswer error:', err);
    res.redirect('/advice');
  }
}

async function editAnswer(req, res) {
  const { answer } = req.body;
  const { answerId } = req.params;
  try {
    const apRes = await db.query('SELECT id FROM alumni_profiles WHERE user_id = $1', [req.user.id]);
    if (!apRes.rows.length) return res.status(403).send('Only alumni can edit answers.');
    const alumniId = apRes.rows[0].id;

    const result = await db.query(
      'UPDATE alumni_advice SET answer = $1, updated_at = now() WHERE id = $2 AND alumni_id = $3 RETURNING id',
      [answer, answerId, alumniId]
    );
    if (result.rows.length === 0) return res.status(403).send('You can only edit your own answers.');

    syncAlumniVector(alumniId).catch((e) => console.error('[qdrant] sync after advice edit failed:', e.message));

    res.redirect('/advice');
  } catch (err) {
    console.error('[advice] editAnswer error:', err);
    res.redirect('/advice');
  }
}

module.exports = { advicePage, postQuestion, postAnswer, editAnswer };
