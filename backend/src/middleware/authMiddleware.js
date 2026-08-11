const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// JWTs are stateless: once issued they stay valid for their full 8 hours no
// matter what happens to the account. That makes "reset this person's
// password because their account is compromised" only half work — whoever
// holds their current token keeps access until it expires.
//
// So after verifying the signature we check the token was issued AFTER the
// password was last changed. A reset therefore ends every existing session.
//
// The cost is one small indexed lookup per authenticated request. At this
// scale that's nothing next to the queries the request itself will run, but
// if it ever became a problem the honest fixes are a short-lived cache or
// dropping token lifetime — not removing the check.
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const result = await pool.query(
      'SELECT password_changed_at FROM it_staff WHERE id = $1',
      [decoded.id]
    );
    const row = result.rows[0];

    // Deleted mid-session.
    if (!row) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }

    // jwt `iat` is in seconds; Date gives milliseconds. The one-second grace
    // covers a token issued in the same second as the change — without it,
    // changing your own password would immediately invalidate the token you
    // just used to change it.
    if (row.password_changed_at) {
      const changedAt = Math.floor(new Date(row.password_changed_at).getTime() / 1000);
      if (decoded.iat && decoded.iat < changedAt - 1) {
        return res.status(401).json({ error: 'Password was changed. Please sign in again.' });
      }
    }

    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    console.error('Auth check failed:', err);
    return res.status(500).json({ error: 'Could not verify your session' });
  }
}

// Canonical role names used across the app
const ROLES = {
  ADMIN: 'IT Admin',
  OFFICER: 'IT Officer',
  BRANCH_MANAGER: 'Branch Manager',
  AUDITOR: 'Auditor',
};

// Legacy accounts created before the role rename may still have role = 'Admin'.
// Treat that as equivalent to 'IT Admin' so existing admins aren't locked out.
function isAdminRole(role) {
  return role === ROLES.ADMIN || role === 'Admin';
}

function requireAdmin(req, res, next) {
  if (!req.user || !isAdminRole(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// General-purpose role gate: requireRole(ROLES.ADMIN, ROLES.OFFICER)
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const ok = allowedRoles.some((r) =>
      r === ROLES.ADMIN ? isAdminRole(req.user.role) : req.user.role === r
    );
    if (!ok) {
      return res.status(403).json({
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireAdmin, requireRole, ROLES };