import { useState, useEffect, useCallback } from 'react';
import api, { updateVerification } from '../api';
import { colors } from '../theme';

const CONDITION_COLORS = {
  'Good': colors.success,
  'Good with issues': colors.warning,
  'Faulty': colors.danger,
};

// Derived from the colour map above so the two can't drift apart. Mirrors
// ASSET_CONDITIONS on the backend, which validates every write.
const CONDITIONS = Object.keys(CONDITION_COLORS);

// Corrections are admin-only, matching the requireRole guard on
// PATCH /verifications/:id. Accounts created before the role rename still
// carry 'Admin', which the backend also accepts.
function currentUserIsAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.role === 'IT Admin' || user?.role === 'Admin';
  } catch {
    return false;
  }
}

export default function VerificationReport() {
  const [rows, setRows] = useState([]);
  const [branch, setBranch] = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ condition: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const isAdmin = currentUserIsAdmin();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (branch) params.branch = branch;
      if (condition) params.condition = condition;
      const res = await api.get('/verifications', { params });
      setRows(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not load the verification report.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branch, condition]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Only re-run on the dropdown; the branch box applies on submit so typing
    // doesn't fire a request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({ condition: row.condition, remarks: row.remarks || '' });
    setNotice('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ condition: '', remarks: '' });
  };

  const saveEdit = async (row) => {
    setSaving(true);
    setNotice('');
    try {
      const updated = await updateVerification(row.id, {
        condition: draft.condition,
        remarks: draft.remarks,
      });

      // Patch the row in place rather than refetching the whole report, so the
      // admin doesn't lose their filters or scroll position.
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                condition: updated.condition,
                remarks: updated.remarks,
                edited_at: updated.edited_at,
                edited_by_name: 'You',
              }
            : r
        )
      );

      setNotice(
        updated.applied_to_asset
          ? `${row.asset_code} corrected. This is the asset's most recent verification, so its current condition was updated too.`
          : `${row.asset_code} corrected. This is an older verification, so the asset's current condition was left as it is.`
      );
      cancelEdit();
    } catch (err) {
      setNotice(err.response?.data?.error || 'Failed to save the correction.');
    } finally {
      setSaving(false);
    }
  };

  // Any field can contain a quote (descriptions and remarks routinely do),
  // so escape all of them rather than just remarks.
  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const exportCsv = () => {
    const header = ['Asset Code', 'Description', 'Condition', 'Remarks', 'Assigned To', 'Branch',
                    'Verified By', 'Verified At', 'Corrected By', 'Corrected At', 'GPS Link'];
    const lines = rows.map((r) => [
      r.asset_code,
      r.description,
      r.condition,
      r.remarks,
      r.assigned_to,
      r.branch,
      r.verified_by_name,
      r.verified_at ? new Date(r.verified_at).toLocaleString() : '',
      r.edited_by_name,
      r.edited_at ? new Date(r.edited_at).toLocaleString() : '',
      r.gps_link,
    ].map(csvCell).join(','));
    const csv = [header.map(csvCell).join(','), ...lines].join('\r\n');
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
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" style={{ padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Filter
        </button>
        <button type="button" onClick={exportCsv} style={{ padding: '10px 20px', background: colors.black, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Export CSV
        </button>
      </form>

      {error && <div style={errorStyle}>{error}</div>}
      {notice && <div style={noticeStyle}>{notice}</div>}

      {loading ? (
        <p style={{ color: colors.white }}>Loading...</p>
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
              {isAdmin && <th style={cellStyle}></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const editing = editingId === r.id;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={cellStyle}>{r.asset_code}</td>

                  <td style={cellStyle}>
                    {editing ? (
                      <select
                        value={draft.condition}
                        onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value }))}
                        style={editSelectStyle}
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        color: colors.white, background: CONDITION_COLORS[r.condition] || colors.grayText,
                      }}>
                        {r.condition}
                      </span>
                    )}
                  </td>

                  <td style={{ ...cellStyle, maxWidth: 260 }}>
                    {editing ? (
                      <input
                        value={draft.remarks}
                        onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))}
                        placeholder="Remarks (optional)"
                        style={editInputStyle}
                      />
                    ) : (
                      r.remarks || '—'
                    )}
                  </td>

                  <td style={cellStyle}>{r.assigned_to || '—'}</td>
                  <td style={cellStyle}>{r.branch || '—'}</td>
                  <td style={cellStyle}>{r.verified_by_name}</td>

                  <td style={cellStyle}>
                    {new Date(r.verified_at).toLocaleString()}
                    {r.edited_at && (
                      <div style={correctedStyle}>
                        corrected by {r.edited_by_name || 'an admin'} on{' '}
                        {new Date(r.edited_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>

                  <td style={cellStyle}>
                    {r.gps_link ? (
                      <a href={r.gps_link} target="_blank" rel="noreferrer" style={{ color: colors.primary }}>
                        View on map
                      </a>
                    ) : '—'}
                  </td>

                  {isAdmin && (
                    <td style={cellStyle}>
                      {editing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveEdit(r)} disabled={saving} style={saveButtonStyle}>
                            {saving ? '...' : 'Save'}
                          </button>
                          <button onClick={cancelEdit} disabled={saving} style={cancelButtonStyle}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(r)} style={editButtonStyle}>Correct</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && rows.length === 0 && !error && (
        <p style={{ color: colors.white }}>No verifications recorded yet.</p>
      )}
    </div>
  );
}

const cellStyle = { padding: '10px 12px', fontSize: 14, verticalAlign: 'top' };
const correctedStyle = { fontSize: 11, color: colors.warning, marginTop: 3, fontStyle: 'italic' };
const editSelectStyle = { padding: '5px 6px', fontSize: 13, borderRadius: 4, border: '1px solid ' + colors.border };
const editInputStyle = { width: '100%', padding: '5px 6px', fontSize: 13, borderRadius: 4, border: '1px solid ' + colors.border, boxSizing: 'border-box' };
const editButtonStyle = { padding: '4px 12px', fontSize: 12, background: colors.gray, color: colors.black, border: '1px solid ' + colors.border, borderRadius: 4, cursor: 'pointer' };
const saveButtonStyle = { padding: '4px 12px', fontSize: 12, background: colors.primary, color: colors.white, border: 'none', borderRadius: 4, cursor: 'pointer' };
const cancelButtonStyle = { padding: '4px 12px', fontSize: 12, background: 'transparent', color: colors.grayText, border: '1px solid ' + colors.border, borderRadius: 4, cursor: 'pointer' };
const errorStyle = { background: '#fdecea', color: colors.danger, padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 16 };
const noticeStyle = { background: '#eaf4ec', color: colors.success, padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 16 };