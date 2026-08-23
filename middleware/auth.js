const jwt = require('jsonwebtoken');

/**
 * Reads the access token from the httpOnly cookie, verifies it, and
 * attaches { id, role } to req.user. If invalid/missing, redirects to
 * login for page routes, or clears user for optional-auth routes.
 */
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.access_token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    res.locals.user = req.user;
    return next();
  } catch (err) {
    return res.redirect('/login');
  }
}

/** Same as requireAuth but for JSON API routes (returns 401 instead of redirect). */
function requireAuthApi(req, res, next) {
  const token = req.cookies && req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Populates req.user / res.locals.user if a valid token is present, but never blocks. */
function attachUserIfPresent(req, res, next) {
  const token = req.cookies && req.cookies.access_token;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { id: payload.sub, role: payload.role };
      res.locals.user = req.user;
    } catch (err) {
      // ignore invalid token for optional-auth pages
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send('Forbidden: insufficient permissions');
    }
    next();
  };
}

module.exports = { requireAuth, requireAuthApi, attachUserIfPresent, requireRole };
