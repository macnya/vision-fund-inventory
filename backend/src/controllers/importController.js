const xlsx = require('xlsx');
const pool = require('../db/pool');
const { ASSET_CONDITIONS, isValidCondition } = require('../constants/assetConditions');

// Bulk import from a spreadsheet, with a preview before anything is written.
//
// WHY PREVIEW FIRST
// A bad import is the one action that can damage 2,311 records at once, and
// every data problem in this register came from an import that reported success
// while doing something unexpected. So this parses the file, compares it with
// what is already there, and reports exactly what it would do — added, changed,
// unchanged, rejected — before a single row is written.
//
// The file is never stored. It is parsed in memory, the diff is returned, and
// the browser sends the rows back when the person confirms. That avoids holding
// uploads on a small instance and avoids a half-applied import if the process
// restarts between the two steps.

// Column headings are trimmed before use. This workbook pads the headings of
// its numeric columns — ' PURCHASE PRICE ', ' NBV ' — while text columns are
// clean, and that single space emptied every financial field in the register
// and understated it by a factor of sixty-six.
function normaliseHeaders(row) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).trim().toUpperCase(), v])
  );
}

// Accepts the several spellings a column has appeared under across eight sheets.
const FIELDS = {
  asset_code:   ['ASSET CODE', 'ASSETCODE', 'CODE'],
  description:  ['DESCRIPTION', 'ASSET DESCRIPTION', 'ITEM'],
  serial:       ['SERIAL NO.', 'SERIAL NO', 'SERIAL NUMBER', 'TABLET IMEI'],
  purchaseDate: ['DATE OF PURCHASE', 'PURCHASE DATE'],
  price:        ['PURCHASE PRICE', 'COST', 'PURCHASE COST'],
  supplier:     ['SUPPLIER', 'VENDOR'],
  branch:       ['BRANCH'],
  department:   ['LOCATION', 'DEPARTMENT'],
  physLoc:      ['PHYSICAL LOCATION', 'CURRENT USER', 'NAME OF USER'],
  status:       ['CURRENT STATUS', 'STATUS'],
  nbv:          ['NBV', 'NET BOOK VALUE'],
  accDep:       ['ACCUMULATED DEPRECIATION'],
  chassis:      ['CHASSIS NO', 'CHASSIS NO.', 'CHASSIS NUMBER'],
  engine:       ['ENGINE NO', 'ENGINE NO.', 'ENGINE NUMBER'],
};

function pick(row, field) {
  for (const name of FIELDS[field]) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') return row[name];
  }
  return null;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  // "1,234.50" and "KES 1,234" both give NaN through Number() alone, and the
  // value is then silently lost.
  const cleaned = typeof value === 'string' ? value.replace(/[^0-9.-]/g, '') : value;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Dates are read as calendar dates, not instants.
//
// The original import called .toISOString() on a date parsed in local time.
// Kenya is UTC+3, so midnight on the 1st became 21:00 on the 30th, and every
// purchase date in the register is one day early. A spreadsheet date has no
// timezone — it is the day written in the cell — so the local parts are read
// directly rather than converted.
function toDate(value) {
  if (!value) return null;

  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Sheets that are not asset registers. This workbook carries cleanup notes, a
// summary, disposal and loss listings, and copies of three sheets somebody
// duplicated in Excel and left in — reading them all produced 1,095 rejections
// and buried the rows that mattered.
const SKIP_SHEET = /^(data cleanup|nc codes|summary|disposal|lost assets|sheet\d*)/i;
const DUPLICATE_SHEET = /\(\d+\)\s*$/;

// Parses the workbook into rows, and says plainly what it could not read.
function parseWorkbook(buffer) {
  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });

  const rows = [];
  const rejections = [];
  const skippedSheets = [];
  const readSheets = [];
  const seenCodes = new Map();
  const seenSerials = new Map();

  for (const sheetName of wb.SheetNames) {
    const name = sheetName.trim();

    if (SKIP_SHEET.test(name) || DUPLICATE_SHEET.test(name)) {
      skippedSheets.push(sheetName);
      continue;
    }
    readSheets.push(sheetName);

    const raw = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });

    raw.forEach((rawRow, i) => {
      const rowNumber = i + 2;                // +1 for the header, +1 for 1-based
      const row = normaliseHeaders(rawRow);
      const code = pick(row, 'asset_code');

      if (!code || !String(code).trim()) return;      // a blank line, not an error

      const assetCode = String(code).trim();

      // Not an asset code. "N/A" gave 168 assets the same code; the balance and
      // variance rows are spreadsheet arithmetic that the original import
      // brought in as sixteen pieces of equipment.
      if (/^(n\/?a|none|nil|-{1,}|tbd)$/i.test(assetCode)
          || /^(balance|system balance|variance|total|grand total|sub[- ]?total)/i.test(assetCode)) {
        rejections.push({ sheet: sheetName, row: rowNumber, code: assetCode,
                          reason: 'Not an asset — a total or balance row' });
        return;
      }

      const description = pick(row, 'description');
      if (!description || !String(description).trim()) {
        rejections.push({ sheet: sheetName, row: rowNumber, code: assetCode,
                          reason: 'No description' });
        return;
      }

      // A code appearing twice in one upload is a mistake in the spreadsheet,
      // not something to resolve silently by taking the last one.
      if (seenCodes.has(assetCode)) {
        rejections.push({ sheet: sheetName, row: rowNumber, code: assetCode,
                          reason: `Duplicate of ${seenCodes.get(assetCode)} in this file` });
        return;
      }
      seenCodes.set(assetCode, `${sheetName} row ${rowNumber}`);

      const serial = pick(row, 'serial');
      const condition = pick(row, 'status');

      const parsed = {
        sheet: sheetName,
        row: rowNumber,
        asset_code: assetCode,
        description: String(description).trim(),
        serial_number: serial ? String(serial).trim() : null,
        date_of_purchase: toDate(pick(row, 'purchaseDate')),
        purchase_price: toNumber(pick(row, 'price')),
        supplier: pick(row, 'supplier'),
        nbv: toNumber(pick(row, 'nbv')),
        accumulated_depreciation: toNumber(pick(row, 'accDep')),
        chassis_number: pick(row, 'chassis'),
        engine_number: pick(row, 'engine'),
        branch: pick(row, 'branch'),
        department: pick(row, 'department'),
        physical_location: pick(row, 'physLoc'),
        // An unrecognised condition is stored as null rather than accepted.
        // Engine numbers in this column are how ~100 assets ended up with a
        // chassis code as their condition.
        condition: condition && isValidCondition(String(condition).trim())
          ? String(condition).trim()
          : null,
        condition_raw: condition ? String(condition).trim() : null,
      };

      // A serial appearing twice is worth flagging but not refusing — two
      // identical monitors legitimately share a blank serial.
      if (parsed.serial_number && !/^n\/?a$/i.test(parsed.serial_number)) {
        if (seenSerials.has(parsed.serial_number)) {
          parsed.warning = `Serial also on ${seenSerials.get(parsed.serial_number)}`;
        } else {
          seenSerials.set(parsed.serial_number, assetCode);
        }
      }

      rows.push(parsed);
    });
  }

  return { rows, rejections, sheetNames: readSheets, skippedSheets };
}

// Fields compared when deciding whether an existing asset would change.
// Deliberately excludes status and condition: those are set by what happens in
// the field, and a spreadsheet should not overwrite an inspection.
const COMPARED = [
  'description', 'serial_number', 'date_of_purchase', 'purchase_price',
  'supplier', 'nbv', 'accumulated_depreciation', 'chassis_number', 'engine_number',
];

// Dates arrive as a JS Date from Postgres and as a string from the sheet, so a
// plain string comparison never matched — which reported 2,201 of 2,291 assets
// as "changed" when only the format differed, burying whatever had genuinely
// moved.
const asDate = (v) => {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

const same = (a, b) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (a instanceof Date || b instanceof Date) {
    const da = asDate(a), db = asDate(b);
    return da != null && da === db;
  }

  if (typeof a === 'number' || typeof b === 'number') {
    // Money is stored to two decimals; a sheet may carry more.
    return Math.abs(Number(a) - Number(b)) < 0.005;
  }

  return String(a).trim() === String(b).trim();
};

// POST /import/preview — parse and compare. Writes nothing.
async function preview(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file was uploaded' });

  try {
    const { rows, rejections, sheetNames, skippedSheets } = parseWorkbook(req.file.buffer);

    if (!rows.length) {
      return res.status(400).json({
        error: 'No usable rows found. Check the sheet has an ASSET CODE and DESCRIPTION column.',
        rejections: rejections.slice(0, 50),
        skipped_sheets: skippedSheets,
      });
    }

    const codes = rows.map((r) => r.asset_code);
    const { rows: existing } = await pool.query(
      `SELECT asset_code, description, serial_number, date_of_purchase,
              purchase_price, supplier, nbv, accumulated_depreciation,
              chassis_number, engine_number
       FROM asset WHERE asset_code = ANY($1::text[])`,
      [codes]
    );
    const byCode = new Map(existing.map((a) => [a.asset_code, a]));

    const added = [];
    const updated = [];
    const unchanged = [];

    for (const r of rows) {
      const current = byCode.get(r.asset_code);

      if (!current) {
        added.push(r);
        continue;
      }

      // Only fields the sheet actually supplies are compared. A blank cell means
      // "no information", not "set this to empty" — otherwise a partial upload
      // would wipe data it never mentioned.
      const changes = COMPARED
        .filter((f) => r[f] != null && !same(r[f], current[f]))
        .map((f) => ({ field: f, from: current[f], to: r[f] }));

      if (changes.length) updated.push({ ...r, changes });
      else unchanged.push(r);
    }

    res.json({
      filename: req.file.originalname,
      sheets: sheetNames,
      skipped_sheets: skippedSheets,
      rows_read: rows.length,
      summary: {
        added: added.length,
        updated: updated.length,
        unchanged: unchanged.length,
        rejected: rejections.length,
      },
      // Samples rather than everything: a preview is for judgement, and nobody
      // reads 2,000 rows in a browser.
      added: added.slice(0, 50),
      updated: updated.slice(0, 50),
      rejections: rejections.slice(0, 50),
      warnings: rows.filter((r) => r.warning).slice(0, 25),
      // Returned so the browser can send them back on confirm, rather than the
      // server holding an upload between two requests.
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not read that file. Is it a valid .xlsx?' });
  }
}

// POST /import/apply — write the rows the person has just seen.
async function apply(req, res) {
  const { rows, mode = 'upsert', filename = 'upload.xlsx', sheets = [] } = req.body;

  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'No rows to import' });
  }
  if (!['add', 'upsert'].includes(mode)) {
    return res.status(400).json({ error: "mode must be 'add' or 'upsert'" });
  }
  if (rows.length > 10000) {
    return res.status(400).json({ error: 'That file is too large to import in one go' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const batch = await client.query(
      `INSERT INTO import_batch (filename, sheet_names, mode, rows_read, imported_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [filename, sheets, mode, rows.length, req.user.id]
    );
    const batchId = batch.rows[0].id;

    let addedCount = 0, updatedCount = 0, unchangedCount = 0;
    const createdCodes = [];

    for (const r of rows) {
      const found = await client.query(
        'SELECT id FROM asset WHERE asset_code = $1', [r.asset_code]
      );

      if (!found.rows.length) {
        await client.query(
          `INSERT INTO asset
             (asset_code, description, serial_number, date_of_purchase, purchase_price,
              supplier, nbv, accumulated_depreciation, chassis_number, engine_number,
              condition, import_batch_id, approval_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'approved')`,
          [r.asset_code, r.description, r.serial_number, r.date_of_purchase,
           r.purchase_price, r.supplier, r.nbv, r.accumulated_depreciation,
           r.chassis_number, r.engine_number, r.condition, batchId]
        );
        addedCount += 1;
        createdCodes.push(r.asset_code);
        continue;
      }

      if (mode === 'add') { unchangedCount += 1; continue; }

      // COALESCE on the incoming value, so a blank cell leaves the existing
      // value alone. A partial upload must not wipe fields it never mentioned.
      const result = await client.query(
        `UPDATE asset SET
           description = COALESCE($2, description),
           serial_number = COALESCE($3, serial_number),
           date_of_purchase = COALESCE($4, date_of_purchase),
           purchase_price = COALESCE($5, purchase_price),
           supplier = COALESCE($6, supplier),
           nbv = COALESCE($7, nbv),
           accumulated_depreciation = COALESCE($8, accumulated_depreciation),
           chassis_number = COALESCE($9, chassis_number),
           engine_number = COALESCE($10, engine_number)
         WHERE asset_code = $1
           AND (
             description IS DISTINCT FROM COALESCE($2, description)
             OR serial_number IS DISTINCT FROM COALESCE($3, serial_number)
             OR date_of_purchase IS DISTINCT FROM COALESCE($4::date, date_of_purchase)
             OR purchase_price IS DISTINCT FROM COALESCE($5, purchase_price)
             OR supplier IS DISTINCT FROM COALESCE($6, supplier)
             OR nbv IS DISTINCT FROM COALESCE($7, nbv)
             OR accumulated_depreciation IS DISTINCT FROM COALESCE($8, accumulated_depreciation)
             OR chassis_number IS DISTINCT FROM COALESCE($9, chassis_number)
             OR engine_number IS DISTINCT FROM COALESCE($10, engine_number)
           )`,
        [r.asset_code, r.description, r.serial_number, r.date_of_purchase,
         r.purchase_price, r.supplier, r.nbv, r.accumulated_depreciation,
         r.chassis_number, r.engine_number]
      );

      if (result.rowCount) updatedCount += 1;
      else unchangedCount += 1;
    }

    await client.query(
      `UPDATE import_batch
       SET rows_added = $1, rows_updated = $2, rows_unchanged = $3, created_codes = $4
       WHERE id = $5`,
      [addedCount, updatedCount, unchangedCount, createdCodes, batchId]
    );

    await client.query('COMMIT');

    res.json({
      batch_id: batchId,
      added: addedCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      message: `${addedCount} added, ${updatedCount} updated, ${unchangedCount} unchanged.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'The import failed and nothing was written.' });
  } finally {
    client.release();
  }
}

// GET /import/batches — what has been imported, and by whom.
async function getBatches(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, s.name AS imported_by_name
       FROM import_batch b
       LEFT JOIN it_staff s ON s.id = b.imported_by
       WHERE b.mode <> 'preview'
       ORDER BY b.imported_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
}

module.exports = { preview, apply, getBatches };