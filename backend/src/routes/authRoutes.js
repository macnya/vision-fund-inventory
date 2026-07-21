const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getUsers,
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


module.exports = router;