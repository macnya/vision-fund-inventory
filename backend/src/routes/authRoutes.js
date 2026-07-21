const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public
router.post('/login', login);

// Admin only
router.post('/register', verifyToken, requireAdmin, register);

module.exports = router;