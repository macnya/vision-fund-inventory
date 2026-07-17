const express = require('express');
const router = express.Router();
const { getAllAssets, getAssetByCode, createAsset } = require('../controllers/assetController');
const { getAssetBarcode } = require('../controllers/barcodeController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getAllAssets);
router.get('/:asset_code/barcode', getAssetBarcode);  // must come BEFORE the line below
router.get('/:asset_code', getAssetByCode);
router.post('/', createAsset);

module.exports = router;