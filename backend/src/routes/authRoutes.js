const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getUsers,
  updateUserRole,
  deleteUser,
} = require('../controllers/authController');

const {
  verifyToken,
  requireAdmin,
} = require('../middleware/authMiddleware');


// Public route
router.post('/login', login);


// Admin protected routes
router.post('/register', verifyToken, requireAdmin, register);

router.get('/users', verifyToken, requireAdmin, getUsers);
router.put('/users/:id/role', verifyToken, requireAdmin, updateUserRole);
router.delete('/users/:id', verifyToken, requireAdmin, deleteUser);


module.exports = router;