const express = require('express');
const router = express.Router();

const {
  getAllAssets,
  getAssetByCode,
  createAsset,
  updateAsset,
  getAllCategories,
  getAllConditions,
  getFilterOptions,
  getPendingAssets,
  reviewAsset,
} = require('../controllers/assetController');
const { verifyAsset } = require('../controllers/verificationController');
const { getAssetBarcode } = require('../controllers/barcodeController');
const { verifyToken, requireRole, ROLES } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getAllAssets);
router.get('/categories', getAllCategories);
router.get('/conditions', getAllConditions);
router.get('/filters', getFilterOptions);

// Must come before /:asset_code, or "pending" is read as an asset code.
router.get('/pending', requireRole(ROLES.ADMIN), getPendingAssets);

router.get('/:asset_code/barcode', getAssetBarcode);
router.get('/:asset_code', getAssetByCode);

// Officers scan unrecognised barcodes in the field and are routed straight to
// "add asset", so they need to finish that flow. Branch Administrators may now
// register equipment arriving at their own branch; the controller holds theirs
// as pending.
router.post('/', requireRole(ROLES.ADMIN, ROLES.OFFICER, ROLES.BRANCH_ADMIN), createAsset);

// Verifying is a field action. Branch Administrators can now do it for their
// own branch; the scope check in the controller enforces that. Every
// verification is held pending regardless of who made it.
router.post('/:asset_code/verify',
  requireRole(ROLES.ADMIN, ROLES.OFFICER, ROLES.BRANCH_ADMIN), verifyAsset);

router.post('/:asset_code/approve', requireRole(ROLES.ADMIN), reviewAsset);
router.post('/:asset_code/reject', requireRole(ROLES.ADMIN), reviewAsset);

// Correcting the register itself remains an Admin action.
router.patch('/:asset_code', requireRole(ROLES.ADMIN), updateAsset);

module.exports = router;