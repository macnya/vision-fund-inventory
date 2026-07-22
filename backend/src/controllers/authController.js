const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { ROLES } = require('../middleware/authMiddleware');

// Register a new IT staff member (use this once to create your first admin, then restrict/remove access later)
async function register(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM it_staff WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO it_staff (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, password_hash, role || 'IT Staff']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
}

// Log in an existing IT staff member
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM it_staff WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
}

// GET /auth/users
async function getUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT
          id,
          name,
          email,
          role,
          created_at
       FROM it_staff
       ORDER BY created_at DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch users"
    });
  }
}

// PUT /auth/users/:id/role — change a user's role
async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = Object.values(ROLES); // ['IT Admin', 'IT Officer', 'Branch Manager', 'Auditor']

  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({
      error: `role is required and must be one of: ${validRoles.join(', ')}`,
    });
  }

  try {
    const result = await pool.query(
      `UPDATE it_staff
       SET role = $1
       WHERE id = $2
       RETURNING id, name, email, role, created_at`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}

// DELETE /auth/users/:id — delete a user (cannot delete yourself)
async function deleteUser(req, res) {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM it_staff WHERE id = $1 RETURNING id, name, email, role`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// POST /auth/refresh — issue a fresh 8h token, as long as the current one hasn't expired yet.
// req.user is populated by verifyToken, which already rejects expired/invalid tokens before this runs.
async function refreshToken(req, res) {
  try {
    // Re-check the user still exists and hasn't been deleted/disabled since the original token was issued
    const result = await pool.query('SELECT id, name, email, role FROM it_staff WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
}

module.exports = { register, login, getUsers, updateUserRole, deleteUser, refreshToken };