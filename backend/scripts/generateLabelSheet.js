require('dotenv').config();
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const pool = require('../src/db/pool');

const OUTPUT_PATH = path.join(__dirname, '../qrcodes/asset-labels.pdf');

// Label sheet layout — tuned for a standard A4 page with a 3x8 grid of labels
// (adjust these if you're using specific label sheet paper, e.g. Avery templates)
const PAGE_WIDTH = 595.28;   // A4 width in points
const PAGE_HEIGHT = 841.89;  // A4 height in points
const MARGIN = 20;
const COLS = 3;
const ROWS = 8;
const LABEL_WIDTH = (PAGE_WIDTH - MARGIN * 2) / COLS;
const LABEL_HEIGHT = (PAGE_HEIGHT - MARGIN * 2) / ROWS;
const QR_SIZE = 80;

async function run() {
  const result = await pool.query(
    'SELECT asset_code, description FROM asset ORDER BY asset_code'
  );
  const assets = result.rows;

  console.log(`Building label sheet for ${assets.length} assets...`);

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
  const stream = fs.createWriteStream(OUTPUT_PATH);
  doc.pipe(stream);

  let col = 0;
  let row = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    // New page once the grid is full
    if (row >= ROWS) {
      doc.addPage();
      row = 0;
      col = 0;
    }

    const x = MARGIN + col * LABEL_WIDTH;
    const y = MARGIN + row * LABEL_HEIGHT;

    // Generate QR as a data URL buffer, embed directly (no need for separate PNG files)
    const qrDataUrl = await QRCode.toDataURL(asset.asset_code, { width: QR_SIZE, margin: 0 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // Draw a light border around each label (helps with cutting)
    doc.rect(x, y, LABEL_WIDTH, LABEL_HEIGHT).stroke('#cccccc');

    // Place QR code, centered horizontally in the label
    const qrX = x + (LABEL_WIDTH - QR_SIZE) / 2;
    doc.image(qrBuffer, qrX, y + 5, { width: QR_SIZE, height: QR_SIZE });

    // Asset code (bold, prominent)
    doc.fontSize(8).font('Helvetica-Bold').text(
      asset.asset_code,
      x + 2,
      y + QR_SIZE + 8,
      { width: LABEL_WIDTH - 4, align: 'center' }
    );

    // Description (smaller, truncated if long)
    const shortDesc = asset.description.length > 30
      ? asset.description.slice(0, 30) + '...'
      : asset.description;
    doc.fontSize(6).font('Helvetica').text(
      shortDesc,
      x + 2,
      y + QR_SIZE + 20,
      { width: LABEL_WIDTH - 4, align: 'center' }
    );

    col++;
    if (col >= COLS) {
      col = 0;
      row++;
    }

    if ((i + 1) % 500 === 0) {
      console.log(`  ...${i + 1} labels placed`);
    }
  }

  doc.end();

  stream.on('finish', async () => {
    console.log(`Done. Label sheet saved to: ${OUTPUT_PATH}`);
    await pool.end();
  });
}

run().catch(err => {
  console.error('Label sheet generation failed:', err);
  process.exit(1);
});