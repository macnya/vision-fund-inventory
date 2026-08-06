const pool = require('../db/pool');
const { ASSET_CONDITIONS, isValidCondition } = require('../constants/assetConditions');

// POST /assets/:asset_code/verify — officer verifies an asset's physical condition
async function verifyAsset(req, res) {
  const { asset_code } = req.params;
  const { condition, remarks, latitude, longitude } = req.body;

  if (!condition || !isValidCondition(condition)) {
    return res.status(400).json({
      error: `condition is required and must be one of: ${ASSET_CONDITIONS.join(', ')}`,
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assetResult = await client.query('SELECT id FROM asset WHERE asset_code = $1', [asset_code]);
    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asset not found' });
    }
    const assetId = assetResult.rows[0].id;

    const result = await client.query(
      `INSERT INTO asset_verification (asset_id, verified_by, condition, remarks, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [assetId, req.user.id, condition, remarks || null, latitude ?? null, longitude ?? null]
    );

    // Keep the asset's headline "condition" field in sync with the latest
    // verification. This runs in the same transaction as the insert above so
    // the two can't disagree if one of them fails.
    await client.query('UPDATE asset SET condition = $1 WHERE id = $2', [condition, assetId]);

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to record verification' });
  } finally {
    client.release();
  }
}

// GET /verifications — report of all verified assets, with assignment, branch, and GPS link
async function getVerificationReport(req, res) {
  const { branch, condition, from, to } = req.query;

  try {
    let query = `
      SELECT
        v.id,
        v.condition,
        v.remarks,
        v.latitude,
        v.longitude,
        v.verified_at,
        a.asset_code,
        a.description,
        s.name AS verified_by_name,
        e.name AS assigned_to,
        l.branch,
        l.physical_location
      FROM asset_verification v
      JOIN asset a ON a.id = v.asset_id
      JOIN it_staff s ON s.id = v.verified_by
      LEFT JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
      LEFT JOIN employee e ON e.id = ag.employee_id
      LEFT JOIN location l ON l.id = ag.location_id
      WHERE 1=1
    `;
    const params = [];

    if (branch) {
      params.push(branch);
      query += ` AND l.branch = $${params.length}`;
    }
    if (condition) {
      params.push(condition);
      query += ` AND v.condition = $${params.length}`;
    }
    if (from) {
      params.push(from);
      query += ` AND v.verified_at >= $${params.length}`;
    }
    if (to) {
      // A date with no time component ("2026-08-06") compared with <= would
      // stop at midnight and exclude everything verified during that day, so
      // treat a bare date as "up to the end of that day".
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(to).trim());
      params.push(to);
      query += isDateOnly
        ? ` AND v.verified_at < (($${params.length})::date + INTERVAL '1 day')`
        : ` AND v.verified_at <= $${params.length}`;
    }

    query += ` ORDER BY v.verified_at DESC LIMIT 1000`;

    const result = await pool.query(query, params);

    const rows = result.rows.map((r) => ({
      ...r,
      gps_link:
        r.latitude != null && r.longitude != null
          ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}`
          : null,
    }));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch verification report' });
  }
}

// GET /assets/:asset_code/verifications — verification history for one asset
async function getVerificationsForAsset(req, res) {
  const { asset_code } = req.params;
  try {
    const result = await pool.query(
      `SELECT v.*, s.name AS verified_by_name
       FROM asset_verification v
       JOIN asset a ON a.id = v.asset_id
       JOIN it_staff s ON s.id = v.verified_by
       WHERE a.asset_code = $1
       ORDER BY v.verified_at DESC`,
      [asset_code]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch verification history' });
  }
}

module.exports = { verifyAsset, getVerificationReport, getVerificationsForAsset };