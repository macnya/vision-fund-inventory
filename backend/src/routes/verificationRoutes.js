const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  verifyAsset,
  getVerificationReport,
  getVerificationsForAsset,
} = require('../controllers/verificationController');

// POST /assets/:asset_code/verify
router.post('/assets/:asset_code/verify', verifyToken, verifyAsset);

// GET /assets/:asset_code/verifications
router.get('/assets/:asset_code/verifications', verifyToken, getVerificationsForAsset);

// GET /verifications  (report, supports ?branch=&condition=&from=&to=)
router.get('/verifications', verifyToken, getVerificationReport);

module.exports = router;