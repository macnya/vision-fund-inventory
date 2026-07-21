const pool = require('../db/pool');

// GET /dashboard/stats — single aggregated payload for the admin dashboard
async function getDashboardStats(req, res) {
  try {
    const [
      totalAssetsResult,
      statusCountsResult,
      employeesResult,
      branchesResult,
      categoriesResult,
      assetsByBranchResult,
      recentActivityResult,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM asset`),

      pool.query(`SELECT status, COUNT(*)::int AS count FROM asset GROUP BY status`),

      pool.query(`SELECT COUNT(*)::int AS count FROM employee`),

      pool.query(`SELECT COUNT(DISTINCT branch)::int AS count FROM location`),

      pool.query(`
        SELECT COALESCE(ac.name, 'Uncategorized') AS name, COUNT(a.id)::int AS count
        FROM asset a
        LEFT JOIN asset_category ac ON a.asset_category_id = ac.id
        GROUP BY ac.name
        ORDER BY count DESC
      `),

      pool.query(`
        SELECT l.branch, COUNT(DISTINCT ag.asset_id)::int AS count
        FROM assignment ag
        JOIN location l ON ag.location_id = l.id
        WHERE ag.returned_date IS NULL
        GROUP BY l.branch
        ORDER BY count DESC
      `),

      pool.query(`
        SELECT sl.action, sl.timestamp, a.asset_code, a.description
        FROM scan_log sl
        JOIN asset a ON sl.asset_id = a.id
        ORDER BY sl.timestamp DESC
        LIMIT 10
      `),
    ]);

    // Flatten status counts into named fields for the KPI cards
    const statusCounts = {};
    statusCountsResult.rows.forEach((row) => {
      statusCounts[row.status] = row.count;
    });

    res.json({
      totalAssets: totalAssetsResult.rows[0].count,
      assigned: statusCounts['Assigned'] || 0,
      inStock: statusCounts['In Stock'] || 0,
      disposed: statusCounts['Disposed'] || 0,
      lost: statusCounts['Lost'] || 0,
      employees: employeesResult.rows[0].count,
      branches: branchesResult.rows[0].count,
      statuses: statusCountsResult.rows,        // for the "Assets by Status" bar chart
      categories: categoriesResult.rows,        // for the "Assets by Category" pie chart
      assetsByBranch: assetsByBranchResult.rows, // for the "Assets by Branch" bar chart
      recentActivity: recentActivityResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}

module.exports = { getDashboardStats };