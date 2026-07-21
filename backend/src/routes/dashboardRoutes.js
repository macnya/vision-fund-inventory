const express = require('express');
const router = express.Router();

const { getDashboardStats } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

// All authenticated roles can view the dashboard (Admin, Officer, Branch Manager, Auditor)
router.use(verifyToken);
router.get('/stats', getDashboardStats);

module.exports = router;