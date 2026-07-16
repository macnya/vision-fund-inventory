const QRCode = require('qrcode');
const pool = require('../db/pool');

// GET /assets/:asset_code/qrcode — returns a QR code image (PNG) encoding the asset_code
async function getAssetQRCode(req, res) {
  const { asset_code } = req.params;

  try {
    // Confirm the asset actually exists before generating a code for it
    const result = await pool.query('SELECT id FROM asset WHERE asset_code = $1', [asset_code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Generate QR code as a PNG buffer, encoding just the asset_code
    const qrBuffer = await QRCode.toBuffer(asset_code, {
      type: 'png',
      width: 300,
      margin: 2,
    });

    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
}

module.exports = { getAssetQRCode };