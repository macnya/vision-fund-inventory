import { useState, useEffect } from 'react';
import api from '../api';
import { colors } from '../theme';

const CONDITION_COLORS = {
  'Good': colors.success,
  'Good with issues': colors.warning,
  'Faulty': colors.danger,
};

export default function VerificationReport() {
  const [rows, setRows] = useState([]);
  const [branch, setBranch] = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (branch) params.branch = branch;
      if (condition) params.condition = condition;
      const res = await api.get('/verifications', { params });
      setRows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    load();
  }, [condition]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const exportCsv = () => {
    const header = ['Asset Code', 'Description', 'Condition', 'Remarks', 'Assigned To', 'Branch', 'Verified By', 'Verified At', 'GPS Link'];
    const lines = rows.map((r) => [
      r.asset_code,
      r.description,
      r.condition,
      (r.remarks || '').replace(/"/g, '""'),
      r.assigned_to || '',
      r.branch || '',
      r.verified_by_name,
      new Date(r.verified_at).toLocaleString(),
      r.gps_link || '',
    ].map((v) => `"${v}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-verifications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 30, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ color: colors.white }}>Asset Verification Report</h1>

      <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid ' + colors.border }}
          placeholder="Filter by branch..."
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
        <select
          style={{ padding: 10, borderRadius: 6, border: '1px solid ' + colors.border }}
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="">All conditions</option>
          <option value="Good">Good</option>
          <option value="Good with issues">Good with issues</option>
          <option value="Faulty">Faulty</option>
        </select>
        <button type="submit" style={{ padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Filter
        </button>
        <button type="button" onClick={exportCsv} style={{ padding: '10px 20px', background: colors.black, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Export CSV
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: colors.gray, textAlign: 'left' }}>
              <th style={cellStyle}>Asset Code</th>
              <th style={cellStyle}>Condition</th>
              <th style={cellStyle}>Remarks</th>
              <th style={cellStyle}>Assigned To</th>
              <th style={cellStyle}>Branch</th>
              <th style={cellStyle}>Verified By</th>
              <th style={cellStyle}>Verified At</th>
              <th style={cellStyle}>GPS Location</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={cellStyle}>{r.asset_code}</td>
                <td style={cellStyle}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    color: colors.white, background: CONDITION_COLORS[r.condition] || colors.grayText,
                  }}>
                    {r.condition}
                  </span>
                </td>
                <td style={{ ...cellStyle, maxWidth: 260 }}>{r.remarks || '—'}</td>
                <td style={cellStyle}>{r.assigned_to || '—'}</td>
                <td style={cellStyle}>{r.branch || '—'}</td>
                <td style={cellStyle}>{r.verified_by_name}</td>
                <td style={cellStyle}>{new Date(r.verified_at).toLocaleString()}</td>
                <td style={cellStyle}>
                  {r.gps_link ? (
                    <a href={r.gps_link} target="_blank" rel="noreferrer" style={{ color: colors.primary }}>
                      View on map
                    </a>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && rows.length === 0 && <p>No verifications recorded yet.</p>}
    </div>
  );
}

const cellStyle = { padding: '10px 12px', fontSize: 14 };