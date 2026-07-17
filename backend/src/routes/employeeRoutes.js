const express = require('express');
const router = express.Router();
const { getAllEmployees, createEmployee } = require('../controllers/employeeController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', getAllEmployees);
router.post('/', createEmployee);

module.exports = router;