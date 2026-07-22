import { useState, useEffect } from 'react';
import { fetchDashboardStats } from '../api';
import { colors } from '../theme';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 30 }}>Loading dashboard...</div>;
  if (!stats) return <div style={{ padding: 30 }}>Failed to load dashboard.</div>;

  const categoryColors = ['#E8720C', '#2E86AB', '#4C9F70', '#8E44AD', '#C0392B', '#F4C430', '#16A085', '#95A5A6'];
  const totalCategoryCount = stats.categories.reduce((sum, c) => sum + c.count, 0);
  let cumulativePercent = 0;
  const pieGradientParts = stats.categories.map((cat, i) => {
    const percent = totalCategoryCount > 0 ? (cat.count / totalCategoryCount) * 100 : 0;
    const start = cumulativePercent;
    cumulativePercent += percent;
    const color = categoryColors[i % categoryColors.length];
    return color + ' ' + start + '% ' + cumulativePercent + '%';
  });
  const pieGradient = 'conic-gradient(' + pieGradientParts.join(', ') + ')';

  const maxBranchCount = Math.max(1, ...stats.assetsByBranch.map((b) => b.count));

  return (
    <div style={{ padding: 30, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ color: colors.white }}>Vision Fund Dashboard</h1>

      <div style={kpiRowStyle}>
        <KpiCard label="Total Assets" value={stats.totalAssets} color={colors.primary} onClick={() => onNavigate('list', '')} />
        <KpiCard label="Assigned" value={stats.assigned} color={colors.black} onClick={() => onNavigate('list', 'Assigned')} />
        <KpiCard label="In Stock" value={stats.inStock} color={colors.primaryDark} onClick={() => onNavigate('list', 'In Stock')} />
        <KpiCard label="Disposed" value={stats.disposed} color={colors.danger} onClick={() => onNavigate('list', 'Disposed')} />
        <KpiCard label="Lost" value={stats.lost} color={colors.warning} onClick={() => onNavigate('list', 'Lost')} />
        <KpiCard label="Employees" value={stats.employees} color={colors.black} />
        <KpiCard label="Branches" value={stats.branches} color={colors.primary} />
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 30, flexWrap: 'wrap' }}>
        <div style={panelStyle}>
          <h3>Assets by Category</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 150, height: 150, borderRadius: '50%', background: pieGradient }} />
            <div>
              {stats.categories.map((cat, i) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: categoryColors[i % categoryColors.length], display: 'inline-block' }} />
                  <span>{cat.name} ({cat.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <h3>Assets by Branch</h3>
          {stats.assetsByBranch.map((b) => (
            <div key={b.branch} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>{b.branch} — {b.count}</div>
              <div style={{ background: '#eee', borderRadius: 4, height: 10 }}>
                <div style={{
                  width: (b.count / maxBranchCount * 100) + '%',
                  background: colors.primary,
                  height: 10,
                  borderRadius: 4,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 20 }}>
        <h3>Recent Activity</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: colors.gray }}>
              <th style={cellStyle}>Date</th>
              <th style={cellStyle}>Action</th>
              <th style={cellStyle}>Asset</th>
              <th style={cellStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentActivity.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={cellStyle}>{new Date(a.timestamp).toLocaleString()}</td>
                <td style={cellStyle}>{a.action}</td>
                <td style={cellStyle}>{a.asset_code}</td>
                <td style={cellStyle}>{a.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...kpiCardStyle,
        borderTop: '4px solid ' + color,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: colors.grayText }}>{label}</div>
    </div>
  );
}

const kpiRowStyle = { display: 'flex', gap: 14, flexWrap: 'wrap' };
const kpiCardStyle = { background: colors.white, borderRadius: 10, padding: '16px 20px', minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const panelStyle = { background: colors.white, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flex: 1, minWidth: 320 };
const cellStyle = { padding: '8px 10px', fontSize: 13 };