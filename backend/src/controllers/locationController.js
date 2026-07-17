const pool = require('../db/pool');

async function getAllLocations(req, res) {
  try {
    const result = await pool.query('SELECT * FROM location ORDER BY branch, physical_location');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
}

async function createLocation(req, res) {
  const { branch, department, physical_location } = req.body;
  if (!branch) return res.status(400).json({ error: 'branch is required' });

  try {
    const result = await pool.query(
      `INSERT INTO location (branch, department, physical_location) VALUES ($1,$2,$3) RETURNING *`,
      [branch, department || null, physical_location || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create location' });
  }
}

module.exports = { getAllLocations, createLocation };