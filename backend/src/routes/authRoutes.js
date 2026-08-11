const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getUsers,
  updateUserRole,
  deleteUser,
  refreshToken,
  changePassword,
  resetUserPassword,
} = require('../controllers/authController');

const {
  verifyToken,
  requireAdmin,
} = require('../middleware/authMiddleware');

const { loginLimiter } = require('../middleware/rateLimiter');


// Public route
router.post('/login', loginLimiter, login);

// Any authenticated user can refresh their own token before it expires
router.post('/refresh', verifyToken, refreshToken);

// Any authenticated user can change their OWN password. Not admin-gated on
// purpose: an officer forced to change a temporary password is not an admin,
// and the endpoint verifies their current password rather than their role.
// Rate limited because it accepts a password guess.
router.post('/change-password', loginLimiter, verifyToken, changePassword);


// Admin protected routes
router.post('/register', verifyToken, requireAdmin, register);

router.get('/users', verifyToken, requireAdmin, getUsers);
router.put('/users/:id/role', verifyToken, requireAdmin, updateUserRole);
router.delete('/users/:id', verifyToken, requireAdmin, deleteUser);

// Sets a temporary password and forces a change on next sign-in.
router.post('/users/:id/reset-password', verifyToken, requireAdmin, resetUserPassword);


module.exports = router;