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
} = require('../controllers/assetController');
const { getAssetBarcode } = require('../controllers/barcodeController');
const { verifyToken, requireRole, ROLES } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getAllAssets);
router.get('/categories', getAllCategories);
router.get('/conditions', getAllConditions);
router.get('/filters', getFilterOptions);
router.get('/:asset_code/barcode', getAssetBarcode);  // must come BEFORE the line below
router.get('/:asset_code', getAssetByCode);

// Officers are the ones in the field scanning unrecognised barcodes, and the
// scanner routes them straight to "Add New Asset" on a 404 — so they need to
// be able to complete that flow, not hit a 403 after filling in the form.
router.post('/', requireRole(ROLES.ADMIN, ROLES.OFFICER), createAsset);

// Correcting the register itself is an admin job. Officers record what they
// see in the field; they don't rewrite purchase prices or descriptions.
router.patch('/:asset_code', requireRole(ROLES.ADMIN), updateAsset);

module.exports = router;