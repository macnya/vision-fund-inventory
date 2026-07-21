async function createAssignment(req, res) {
  const {
    asset_id,
    employee_id,
    location_id,
    latitude,
    longitude,
  } = req.body;

  const assigned_by = req.user.id;

  if (!asset_id) {
    return res.status(400).json({ error: "asset_id is required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const activeAssignment = await client.query(
      `SELECT * FROM assignment
       WHERE asset_id = $1
       AND returned_date IS NULL`,
      [asset_id]
    );

    let fromEmployeeId = null;
    let fromLocationId = null;

    if (activeAssignment.rows.length > 0) {
      const prev = activeAssignment.rows[0];

      fromEmployeeId = prev.employee_id;
      fromLocationId = prev.location_id;

      await client.query(
        `UPDATE assignment
         SET returned_date = NOW()
         WHERE id = $1`,
        [prev.id]
      );
    }

    const newAssignment = await client.query(
      `INSERT INTO assignment
        (asset_id, employee_id, location_id, assigned_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        asset_id,
        employee_id || null,
        location_id || null,
        assigned_by,
      ]
    );

    await client.query(
      `UPDATE asset
       SET status = 'Assigned'
       WHERE id = $1`,
      [asset_id]
    );

    await client.query(
      `INSERT INTO scan_log
        (
          asset_id,
          scanned_by,
          action,
          from_location_id,
          to_location_id,
          from_employee_id,
          to_employee_id,
          latitude,
          longitude
        )
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        asset_id,
        assigned_by,
        "Transfer",
        fromLocationId,
        location_id || null,
        fromEmployeeId,
        employee_id || null,
        latitude || null,
        longitude || null,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json(newAssignment.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Create Assignment Error:", {
      message: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      error: "Failed to create assignment",
      details: err.message,
    });

  } finally {
    client.release();
  }
}