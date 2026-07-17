const express = require('express');
const router = express.Router();
const { getAllLocations, createLocation } = require('../controllers/locationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', getAllLocations);
router.post('/', createLocation);

module.exports = router;