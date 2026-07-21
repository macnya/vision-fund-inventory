const express = require('express');
const router = express.Router();
const { getAllLocations, createLocation } = require('../controllers/locationController');
const { verifyToken, requireRole, ROLES } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', getAllLocations);
router.post('/', requireRole(ROLES.ADMIN), createLocation);

module.exports = router;