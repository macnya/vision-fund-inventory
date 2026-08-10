const express = require('express');
const router = express.Router();
const { verifyToken, requireRole, ROLES } = require('../middleware/authMiddleware');
const {
  verifyAsset,
  getVerificationReport,
  getVerificationsForAsset,
  updateVerification,
} = require('../controllers/verificationController');

// POST /assets/:asset_code/verify
// Writing a verification also overwrites asset.condition, so this is a mutation
// and is gated like every other write. Read-only roles (Branch Manager,
// Auditor) can still view the reports below.
router.post(
  '/assets/:asset_code/verify',
  verifyToken,
  requireRole(ROLES.ADMIN, ROLES.OFFICER),
  verifyAsset
);

// GET /assets/:asset_code/verifications
router.get('/assets/:asset_code/verifications', verifyToken, getVerificationsForAsset);

// GET /verifications  (report, supports ?branch=&condition=&from=&to=)
router.get('/verifications', verifyToken, getVerificationReport);

// PATCH /verifications/:id — correct a mistyped condition or remark.
// Admin only: officers record what they see, admins correct the record.
router.patch(
  '/verifications/:id',
  verifyToken,
  requireRole(ROLES.ADMIN),
  updateVerification
);

module.exports = router;