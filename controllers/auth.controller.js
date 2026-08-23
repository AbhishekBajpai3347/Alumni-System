const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days fallback for DB expiry

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '7 days')`,
    [user.id, hashToken(refreshToken)]
  );

  res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: REFRESH_EXPIRES_MS });
}

// ---------- Views ----------

function showLogin(req, res) {
  res.render('auth/login', { error: null });
}

function showRegister(req, res) {
  res.render('auth/register', { error: null });
}

// ---------- Actions ----------

async function registerStudent(req, res) {
  const { name, email, password, enrollment_number, branch, year, graduation_year, interests } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.render('auth/register', { error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id`,
      [email, passwordHash]
    );
    const userId = userRes.rows[0].id;

    let deptId = null;
    if (branch) {
      const deptRes = await client.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [branch]
      );
      deptId = deptRes.rows[0].id;
    }

    const spRes = await client.query(
      `INSERT INTO student_profiles (user_id, name, enrollment_number, department_id, year, graduation_year)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, name, enrollment_number, deptId, year || null, graduation_year || null]
    );
    const studentId = spRes.rows[0].id;

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
    await issueTokens(res, { id: userId, role: 'student' });
    res.redirect('/');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth] registerStudent error:', err);
    res.render('auth/register', { error: 'Registration failed. Please check your input and try again.' });
  } finally {
    client.release();
  }
}

async function registerAlumni(req, res) {
  const { name, email, password, branch, graduation_year, company, job_role, location, bio, linkedin_url, github_url } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.render('auth/register', { error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'alumni') RETURNING id`,
      [email, passwordHash]
    );
    const userId = userRes.rows[0].id;

    let deptId = null;
    if (branch) {
      const deptRes = await client.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [branch]
      );
      deptId = deptRes.rows[0].id;
    }

    let companyId = null;
    if (company) {
      const compRes = await client.query(
        `INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [company]
      );
      companyId = compRes.rows[0].id;
    }

    await client.query(
      `INSERT INTO alumni_profiles
       (user_id, name, department_id, graduation_year, company_id, job_role, location, bio, linkedin_url, github_url, onboarding_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
      [userId, name, deptId, graduation_year || null, companyId, job_role || null, location || null, bio || null, linkedin_url || null, github_url || null]
    );

    await client.query('COMMIT');
    await issueTokens(res, { id: userId, role: 'alumni' });
    // Section 13: after first login, redirect alumni to the survey.
    res.redirect('/alumni/survey');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth] registerAlumni error:', err);
    res.render('auth/register', { error: 'Registration failed. Please check your input and try again.' });
  } finally {
    client.release();
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }
    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    await issueTokens(res, user);

    if (user.role === 'alumni') {
      const apRes = await db.query('SELECT onboarding_completed FROM alumni_profiles WHERE user_id = $1', [user.id]);
      if (apRes.rows.length && !apRes.rows[0].onboarding_completed) {
        return res.redirect('/alumni/survey');
      }
    }
    res.redirect('/');
  } catch (err) {
    console.error('[auth] login error:', err);
    res.render('auth/login', { error: 'Something went wrong. Please try again.' });
  }
}

async function refresh(req, res) {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const tokenHash = hashToken(token);

    const stored = await db.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > now()`,
      [tokenHash]
    );
    if (stored.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token invalid or revoked' });
    }

    const accessToken = signAccessToken({ id: payload.sub, role: payload.role });
    res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function logout(req, res) {
  const token = req.cookies && req.cookies.refresh_token;
  if (token) {
    try {
      const tokenHash = hashToken(token);
      // Invalidate this specific refresh token/session (section on Authentication).
      await db.query(`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, [tokenHash]);
    } catch (err) {
      console.error('[auth] logout revoke error:', err);
    }
  }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.redirect('/login');
}

module.exports = { showLogin, showRegister, registerStudent, registerAlumni, login, refresh, logout };
