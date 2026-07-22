const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getUsers,
  updateUserRole,
  deleteUser,
  refreshToken,
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


// Admin protected routes
router.post('/register', verifyToken, requireAdmin, register);

router.get('/users', verifyToken, requireAdmin, getUsers);
router.put('/users/:id/role', verifyToken, requireAdmin, updateUserRole);
router.delete('/users/:id', verifyToken, requireAdmin, deleteUser);


module.exports = router;