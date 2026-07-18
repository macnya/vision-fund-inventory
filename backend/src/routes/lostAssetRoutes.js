const express = require('express');
const router = express.Router();
const { createLostAssetRecord, getAllLostAssets } = require('../controllers/lostAssetController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/', getAllLostAssets);
router.post('/', createLostAssetRecord);

module.exports = router;