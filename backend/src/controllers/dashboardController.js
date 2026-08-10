const pool = require('../db/pool');
const PDFDocument = require('pdfkit');

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

// GET /dashboard/asset-locations
//
// Latest known GPS position per asset, from whichever is more recent: a
// scan_log entry (assign / transfer / check-in) or an asset_verification.
//
// ?verifiedOnly=true restricts the map to positions captured during a physical
// VERIFICATION, ignoring assignment and check-in scans. The two answer
// different questions: "where was this last touched" versus "where has someone
// actually stood next to it and confirmed its condition".
async function getAssetLocations(req, res) {
  const verifiedOnly = String(req.query.verifiedOnly).toLowerCase() === 'true';

  try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.asset_code,
        a.description,
        a.status,
        a.condition AS asset_condition,
        ac.name AS category_name,
        loc.latitude,
        loc.longitude,
        loc.recorded_at,
        loc.source,
        loc.condition AS verified_condition,
        l.branch AS current_branch,
        e.name AS current_holder
      FROM asset a
      LEFT JOIN asset_category ac ON a.asset_category_id = ac.id
      LEFT JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
      LEFT JOIN location l ON l.id = ag.location_id
      LEFT JOIN employee e ON e.id = ag.employee_id
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, recorded_at, source, condition FROM (
          -- Scans are excluded entirely when verifiedOnly is set, rather than
          -- filtered afterwards, so the "most recent" pick below still returns
          -- the latest VERIFICATION and not the latest scan.
          SELECT sl.latitude, sl.longitude, sl.timestamp AS recorded_at,
                 sl.action AS source, NULL::text AS condition
          FROM scan_log sl
          WHERE sl.asset_id = a.id
            AND sl.latitude IS NOT NULL AND sl.longitude IS NOT NULL
            AND NOT $1::boolean
          UNION ALL
          SELECT v.latitude, v.longitude, v.verified_at AS recorded_at,
                 'Verification' AS source, v.condition
          FROM asset_verification v
          WHERE v.asset_id = a.id
            AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
        ) combined
        ORDER BY recorded_at DESC
        LIMIT 1
      ) loc ON true
      WHERE loc.latitude IS NOT NULL
      ORDER BY loc.recorded_at DESC
    `, [verifiedOnly]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch asset locations' });
  }
}


async function getSummaryReportPdf(req, res) {
  try {
    const [totalsResult, categoryResult, branchResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_count,
          COALESCE(SUM(purchase_price), 0)::numeric AS total_value
        FROM asset
      `),
      pool.query(`
        SELECT
          COALESCE(ac.name, 'Uncategorized') AS name,
          COUNT(a.id)::int AS count,
          COALESCE(SUM(a.purchase_price), 0)::numeric AS value
        FROM asset a
        LEFT JOIN asset_category ac ON a.asset_category_id = ac.id
        GROUP BY ac.name
        ORDER BY value DESC
      `),
      pool.query(`
        SELECT
          COALESCE(l.branch, 'Unassigned / In Storage') AS branch,
          COUNT(DISTINCT a.id)::int AS count,
          COALESCE(SUM(a.purchase_price), 0)::numeric AS value
        FROM asset a
        LEFT JOIN assignment ag ON ag.asset_id = a.id AND ag.returned_date IS NULL
        LEFT JOIN location l ON l.id = ag.location_id
        GROUP BY l.branch
        ORDER BY value DESC
      `),
    ]);

    const totals = totalsResult.rows[0];
    const categories = categoryResult.rows;
    const branches = branchResult.rows;

    const formatMoney = (n) =>
      'KES ' + Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="vision-fund-asset-summary.pdf"');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1a1a1a').text('Vision Fund Kenya', { continued: false });
    doc.fontSize(14).fillColor('#E8720C').text('Asset Summary Report');
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#777').text(`Generated ${new Date().toLocaleString('en-KE')}`);
    doc.moveDown(1.2);

    doc.fontSize(12).fillColor('#1a1a1a').text(`Total Assets: ${totals.total_count}`);
    doc.text(`Total Value: ${formatMoney(totals.total_value)}`);
    doc.moveDown(1.2);

    drawTable(doc, 'Assets by Category', categories, 'name');
    doc.moveDown(1.2);
    drawTable(doc, 'Assets by Branch', branches, 'branch');

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  function drawTable(doc, title, rows, labelKey) {
    doc.fontSize(13).fillColor('#1a1a1a').text(title);
    doc.moveDown(0.4);

    const startX = doc.x;
    let y = doc.y;
    const col1 = startX;
    const col2 = startX + 300;
    const col3 = startX + 400;

    doc.fontSize(10).fillColor('#777');
    doc.text('Name', col1, y);
    doc.text('Count', col2, y);
    doc.text('Value', col3, y);
    y += 16;
    doc.moveTo(startX, y).lineTo(startX + 500, y).strokeColor('#e0e0e0').stroke();
    y += 6;

    doc.fontSize(10).fillColor('#1a1a1a');
    rows.forEach((row) => {
      if (y > 760) {
        doc.addPage();
        y = doc.y;
      }
      doc.text(String(row[labelKey]), col1, y, { width: 290 });
      doc.text(String(row.count), col2, y);
      doc.text(formatMoney(row.value), col3, y);
      y += 18;
    });

    doc.y = y;
  }
}

module.exports = { getDashboardStats, getAssetLocations, getSummaryReportPdf };