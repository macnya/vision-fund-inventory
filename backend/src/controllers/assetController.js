const pool = require('../db/pool');

// GET /assets — list all assets
async function getAllAssets(req, res) {
  try {
    const result = await pool.query(`
      SELECT a.*, ac.name AS category_name
      FROM asset a
      LEFT JOIN asset_category ac ON a.asset_category_id = ac.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}

// GET /assets/:asset_code — lookup a single asset by its QR/barcode value (used by the scanner)
async function getAssetByCode(req, res) {
  const { asset_code } = req.params;

  try {
    const assetResult = await pool.query(
      `SELECT a.*, ac.name AS category_name
       FROM asset a
       LEFT JOIN asset_category ac ON a.asset_category_id = ac.id
       WHERE a.asset_code = $1`,
      [asset_code]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = assetResult.rows[0];

    const assignmentResult = await pool.query(
      `SELECT ag.*, e.name AS employee_name, l.branch, l.department, l.physical_location
       FROM assignment ag
       LEFT JOIN employee e ON ag.employee_id = e.id
       LEFT JOIN location l ON ag.location_id = l.id
       WHERE ag.asset_id = $1 AND ag.returned_date IS NULL`,
      [asset.id]
    );

    res.json({
      asset,
      current_assignment: assignmentResult.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
}

// POST /assets — create a new asset
async function createAsset(req, res) {
  const {
    asset_code, description, asset_category_id, serial_number,
    date_of_purchase, purchase_price, supplier,
    useful_life_years, remaining_life, monthly_depreciation,
    accumulated_depreciation, nbv, current_end_month_date, condition
  } = req.body;

  if (!asset_code || !description) {
    return res.status(400).json({ error: 'asset_code and description are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO asset
        (asset_code, description, asset_category_id, serial_number, date_of_purchase,
         purchase_price, supplier, useful_life_years, remaining_life, monthly_depreciation,
         accumulated_depreciation, nbv, current_end_month_date, condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [asset_code, description, asset_category_id, serial_number, date_of_purchase,
       purchase_price, supplier, useful_life_years, remaining_life, monthly_depreciation,
       accumulated_depreciation, nbv, current_end_month_date, condition || 'Good']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'asset_code already exists' });
    }
    res.status(500).json({ error: 'Failed to create asset' });
  }
}

module.exports = { getAllAssets, getAssetByCode, createAsset };