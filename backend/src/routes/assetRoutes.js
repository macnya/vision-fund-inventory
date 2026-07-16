const express = require('express');
const router = express.Router();
const { getAllAssets, getAssetByCode, createAsset } = require('../controllers/assetController');
const { getAssetQRCode } = require('../controllers/qrController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', getAllAssets);
router.get('/:asset_code/qrcode', getAssetQRCode);  // add this BEFORE the line below
router.get('/:asset_code', getAssetByCode);
router.post('/', createAsset);

module.exports = router;