require('dotenv').config();
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pool = require('../src/db/pool');

const OUTPUT_DIR = path.join(__dirname, '../qrcodes');

async function run() {
  // Make sure output folder exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const result = await pool.query('SELECT asset_code, description FROM asset ORDER BY asset_code');
  const assets = result.rows;

  console.log(`Generating QR codes for ${assets.length} assets...`);

  let count = 0;
  for (const asset of assets) {
    const safeFileName = asset.asset_code.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(OUTPUT_DIR, `${safeFileName}.png`);

    await QRCode.toFile(filePath, asset.asset_code, {
      width: 300,
      margin: 2,
    });

    count++;
    if (count % 200 === 0) {
      console.log(`  ...${count} generated so far`);
    }
  }

  console.log(`Done. ${count} QR code images saved to: ${OUTPUT_DIR}`);
  await pool.end();
}

run().catch(err => {
  console.error('QR generation failed:', err);
  process.exit(1);
});