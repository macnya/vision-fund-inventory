const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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