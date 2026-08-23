require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

const { attachUserIfPresent, requireAuth } = require('./middleware/auth');
const { ensureCollection } = require('./config/qdrant');

const authRoutes = require('./routes/auth.routes');
const alumniRoutes = require('./routes/alumni.routes');
const studentRoutes = require('./routes/student.routes');
const aiRoutes = require('./routes/ai.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adviceRoutes = require('./routes/advice.routes');
const studentController = require('./controllers/student.controller');
const db = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(attachUserIfPresent);

// Home page (section 3) -- role-aware, redirects alumni to onboarding survey if incomplete.
app.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'alumni') {
      const r = await db.query('SELECT onboarding_completed FROM alumni_profiles WHERE user_id = $1', [req.user.id]);
      if (r.rows.length && !r.rows[0].onboarding_completed) {
        return res.redirect('/alumni/survey');
      }
    }
    return studentController.renderHome(req, res);
  } catch (err) {
    next(err);
  }
});

app.use('/auth', authRoutes);
// Keep /login and /register as short aliases (section 2 nav wording).
app.get('/login', (req, res) => res.redirect('/auth/login'));
app.get('/register', (req, res) => res.redirect('/auth/register'));

app.use('/alumni', alumniRoutes);
app.use('/student', studentRoutes);
app.use('/ai', aiRoutes);
app.use('/insights', analyticsRoutes);
app.use('/advice', adviceRoutes);

app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
  console.error('[app] Unhandled error:', err);
  res.status(500).send('Something went wrong.');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Alumni Career Intelligence System running on http://localhost:${PORT}`);
  await ensureCollection();
});

module.exports = app;
