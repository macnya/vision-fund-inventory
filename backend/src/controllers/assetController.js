const pool = require('../db/pool');
const {
  ASSET_CONDITIONS,
  DEFAULT_CONDITION,
  isValidCondition,
} = require('../constants/assetConditions');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// The joins are shared between the page query and the count query so the
// reported total can never drift from the rows actually returned.
const ASSET_JOINS = `
  FROM asset a
  LEFT JOIN asset_category ac ON a.asset_category_id = ac.id
  LEFT JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
  LEFT JOIN employee e ON ag.employee_id = e.id
  LEFT JOIN location l ON ag.location_id = l.id
`;

function buildAssetFilter({ search, category, status, branch }) {
  const clauses = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(a.asset_code ILIKE $${params.length} OR a.description ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    clauses.push(`ac.name = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`a.status = $${params.length}`);
  }
  if (branch) {
    params.push(branch);
    clauses.push(`l.branch = $${params.length}`);
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

// GET /assets — paginated list.
//
// Returns { data, total, limit, offset } rather than a bare array. The old
// version applied a hard LIMIT 200 with no offset and no count, so against a
// register of several thousand assets the client silently displayed a
// truncated slice with no way to reach the rest.
async function getAllAssets(req, res) {
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const parsedOffset = Number.parseInt(req.query.offset, 10);

  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

  try {
    const { where, params } = buildAssetFilter(req.query);

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT a.id)::int AS total ${ASSET_JOINS} ${where}`,
      params
    );

    const pageParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT a.*, ac.name AS category_name,
              ag.employee_id, ag.location_id,
              e.name AS employee_name, l.branch, l.physical_location
       ${ASSET_JOINS}
       ${where}
       ORDER BY a.asset_code
       LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams
    );

    res.json({
      data: result.rows,
      total: countResult.rows[0].total,
      limit,
      offset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}

// GET /assets/categories — list all asset categories (for dropdowns)
async function getAllCategories(req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM asset_category ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

// GET /assets/conditions — the canonical condition vocabulary, so the web and
// mobile clients don't have to keep their own copies in sync by hand.
async function getAllConditions(req, res) {
  res.json(ASSET_CONDITIONS);
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
      `SELECT ag.*, e.name AS employee_name, e.department AS employee_department,
              e.branch AS employee_branch, l.branch, l.department, l.physical_location
       FROM assignment ag
       LEFT JOIN employee e ON ag.employee_id = e.id
       LEFT JOIN location l ON ag.location_id = l.id
       WHERE ag.asset_id = $1 AND ag.returned_date IS NULL`,
      [asset.id]
    );

    // Most recent GPS fix for this asset, from whichever is newer: a scan
    // (assign / transfer / check-in) or a physical verification. An office
    // name like "Eldoret Office" says where it is supposed to be; this says
    // where it was last actually seen.
    const lastSeenResult = await pool.query(
      `SELECT latitude, longitude, recorded_at, source FROM (
         SELECT sl.latitude, sl.longitude, sl.timestamp AS recorded_at, sl.action AS source
         FROM scan_log sl
         WHERE sl.asset_id = $1 AND sl.latitude IS NOT NULL AND sl.longitude IS NOT NULL
         UNION ALL
         SELECT v.latitude, v.longitude, v.verified_at AS recorded_at, 'Verification' AS source
         FROM asset_verification v
         WHERE v.asset_id = $1 AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
       ) combined
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [asset.id]
    );

    // If nobody holds it now, who held it last? Useful when chasing an asset
    // that reads In Stock but isn't on the shelf.
    const lastHolderResult = await pool.query(
      `SELECT e.name AS employee_name, l.branch, l.physical_location, ag.returned_date
       FROM assignment ag
       LEFT JOIN employee e ON ag.employee_id = e.id
       LEFT JOIN location l ON ag.location_id = l.id
       WHERE ag.asset_id = $1 AND ag.returned_date IS NOT NULL
       ORDER BY ag.returned_date DESC
       LIMIT 1`,
      [asset.id]
    );

    const lastSeen = lastSeenResult.rows[0] || null;

    res.json({
      asset,
      current_assignment: assignmentResult.rows[0] || null,
      last_seen: lastSeen
        ? {
            ...lastSeen,
            map_url: `https://www.google.com/maps?q=${lastSeen.latitude},${lastSeen.longitude}`,
          }
        : null,
      last_holder: assignmentResult.rows.length === 0 ? lastHolderResult.rows[0] || null : null,
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

  if (condition && !isValidCondition(condition)) {
    return res.status(400).json({
      error: `condition must be one of: ${ASSET_CONDITIONS.join(', ')}`,
    });
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
       accumulated_depreciation, nbv, current_end_month_date, condition || DEFAULT_CONDITION]
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

module.exports = {
  getAllAssets,
  getAssetByCode,
  createAsset,
  getAllCategories,
  getAllConditions,
};