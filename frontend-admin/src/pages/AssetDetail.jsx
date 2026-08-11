import { useState, useEffect, useCallback } from 'react';
import { fetchAssetDetail, fetchAssetHistory, markAssetDisposed, markAssetLost, updateAsset, fetchAssetFilters } from '../api';
import { colors } from '../theme';
import { API_BASE_URL } from '../config';

// Mirrors the EDITABLE list on the backend. asset_code and status are absent
// on purpose: the code is printed on a physical label, and status is derived
// from assignment, disposal and loss actions.
const EDITABLE_FIELDS = [
  { key: 'description',      label: 'Description',    type: 'text',   required: true },
  { key: 'asset_category_id', label: 'Category',      type: 'category' },
  { key: 'serial_number',    label: 'Serial number',  type: 'text' },
  { key: 'chassis_number',   label: 'Chassis number', type: 'text' },
  { key: 'engine_number',    label: 'Engine number',  type: 'text' },
  { key: 'supplier',         label: 'Supplier',       type: 'text' },
  { key: 'purchase_price',   label: 'Purchase price', type: 'number' },
  { key: 'nbv',              label: 'NBV',            type: 'number' },
  { key: 'date_of_purchase', label: 'Date of purchase', type: 'date' },
  { key: 'condition',        label: 'Condition',      type: 'condition' },
];

function isAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.role === 'IT Admin' || user?.role === 'Admin';
  } catch {
    return false;
  }
}

export default function AssetDetail({ assetCode, onBack }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [options, setOptions] = useState({ categories: [], conditions: [] });
  const admin = isAdmin();

  // useCallback so the effect below can depend on it honestly, and so saveEdit
  // gets a stable reference rather than a new function on every render.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchAssetDetail(assetCode);
      setData(detail);
      const hist = await fetchAssetHistory(detail.asset.id);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [assetCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (!admin) return;
    fetchAssetFilters().then(setOptions).catch(() => {});
  }, [admin]);

  const startEdit = () => {
    const d = {};
    EDITABLE_FIELDS.forEach(({ key, type }) => {
      const v = data.asset[key];
      d[key] = v == null ? '' : type === 'date' ? String(v).split('T')[0] : String(v);
    });
    setDraft(d);
    setNotice('');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft.description?.trim()) {
      setNotice('Description cannot be empty.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      // Send only what actually changed, so an untouched field can't be
      // overwritten by a stale value from when the form was opened.
      const changes = {};
      EDITABLE_FIELDS.forEach(({ key, type }) => {
        const original = data.asset[key];
        const current = draft[key];
        const same = (original == null ? '' : type === 'date' ? String(original).split('T')[0] : String(original)) === current;
        if (!same) changes[key] = current;
      });

      if (Object.keys(changes).length === 0) {
        setEditing(false);
        return;
      }

      const updated = await updateAsset(assetCode, changes);
      setData((prev) => ({ ...prev, asset: { ...prev.asset, ...updated } }));
      setEditing(false);
      setNotice(`Saved ${Object.keys(changes).length} change${Object.keys(changes).length === 1 ? '' : 's'}.`);
      loadData();     // refresh category name and history
    } catch (err) {
      setNotice(err.response?.data?.error || 'Could not save these changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDisposed = async () => {
    const salesProceeds = prompt('Sales proceeds (leave blank if none):');
    const notes = prompt('Notes (optional):') || '';
    if (!window.confirm('Mark ' + data.asset.asset_code + ' as Disposed?')) return;

    try {
      await markAssetDisposed({
        asset_id: data.asset.id,
        sales_proceeds: salesProceeds ? parseFloat(salesProceeds) : null,
        disposal_month: new Date().toISOString().split('T')[0],
        notes,
      });
      alert('Asset marked as disposed.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as disposed.');
    }
  };

  const handleMarkLost = async () => {
    const notes = prompt('Notes on the loss (optional):') || '';
    if (!window.confirm('Report ' + data.asset.asset_code + ' as Lost?')) return;

    try {
      await markAssetLost({ asset_id: data.asset.id, notes });
      alert('Asset reported as lost.');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to report as lost.');
    }
  };

  const handlePrintBarcode = async () => {
    try {
      const token = localStorage.getItem('token');
      // Was hardcoded to production, so barcodes printed from a local dev
      // session silently hit the live server.
      const response = await fetch(
        `${API_BASE_URL}/assets/${encodeURIComponent(data.asset.asset_code)}/barcode`,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!response.ok) throw new Error('Failed to fetch barcode');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert('Failed to load barcode image.');
    }
  };

  if (loading) return <div style={{ padding: 30 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 30 }}>Asset not found.</div>;

  const asset = data.asset;
  const current_assignment = data.current_assignment;

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>Back to list</button>

      <h1 style={{ color: colors.ink, marginBottom: 4 }}>{asset.asset_code}</h1>
      <button onClick={handlePrintBarcode} style={barcodeLinkStyle}>View / Print Barcode</button>
      <p style={{ color: '#555', marginTop: 8 }}>{asset.description}</p>

      {notice && (
        <div style={notice.startsWith('Saved') ? noticeStyle : errorNoticeStyle}>{notice}</div>
      )}

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Details</h3>
          {admin && !editing && (
            <button onClick={startEdit} style={editButtonStyle}>Edit details</button>
          )}
        </div>

        {editing ? (
          <>
            {EDITABLE_FIELDS.map((f) => (
              <EditRow
                key={f.key}
                field={f}
                value={draft[f.key] ?? ''}
                options={options}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
              />
            ))}

            {/* Not editable here, and shown so it's clear that's deliberate. */}
            <Row label="Asset Code" value={asset.asset_code} />
            <Row label="Status" value={asset.status} />
            <p style={lockedNote}>
              The asset code is printed on the physical label, and status follows
              assignment, disposal and loss actions — neither is edited here.
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={saveEdit} disabled={saving} style={saveButtonStyle}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button onClick={() => setEditing(false)} disabled={saving} style={cancelButtonStyle}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <Row label="Category" value={asset.category_name} />
            <Row label="Serial Number" value={asset.serial_number} />
            {/* Vehicles only — hidden for assets that have no such identifier. */}
            {asset.chassis_number && <Row label="Chassis No" value={asset.chassis_number} />}
            {asset.engine_number && <Row label="Engine No" value={asset.engine_number} />}
            <Row label="Status" value={asset.status} />
            {/* A null condition means nobody has physically inspected it yet,
                which is different from "-" meaning missing data. */}
            <Row label="Condition" value={asset.condition || 'Not yet verified'} />
            <Row label="Purchase Date" value={asset.date_of_purchase ? asset.date_of_purchase.split('T')[0] : null} />
            <Row label="Purchase Price" value={asset.purchase_price} />
            <Row label="Supplier" value={asset.supplier} />
            <Row label="NBV" value={asset.nbv} />
          </>
        )}
      </div>

      <div style={sectionStyle}>
        <h3>Current Assignment</h3>
        {current_assignment ? (
          <div>
            <Row label="Employee" value={current_assignment.employee_name || '-'} />
            <Row label="Branch" value={current_assignment.branch || '-'} />
            <Row label="Location" value={current_assignment.physical_location || '-'} />
          </div>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>Not currently assigned</p>
        )}
      </div>

      {asset.status !== 'Disposed' && asset.status !== 'Lost' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={handleMarkDisposed} style={dangerButtonStyle}>Mark as Disposed</button>
          <button onClick={handleMarkLost} style={warningButtonStyle}>Report as Lost</button>
        </div>
      )}

      <div style={sectionStyle}>
        <h3>Audit History</h3>
        {history.length === 0 ? (
          <p style={{ color: '#999' }}>No history recorded.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f4f5f7' }}>
                <th style={cellStyle}>Date</th>
                <th style={cellStyle}>Action</th>
                <th style={cellStyle}>By</th>
                <th style={cellStyle}>From</th>
                <th style={cellStyle}>To</th>
                <th style={cellStyle}>Location (GPS)</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const hasGPS = h.latitude != null && h.longitude != null;

                const mapUrl = hasGPS
                  ? `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`
                  : "";
                let badgeColor = "#6b7280";

                if (h.action === "Transfer") badgeColor = "#2563eb";
                if (h.action === "Check-In") badgeColor = "#16a34a";
                if (h.action === "Disposed") badgeColor = "#dc2626";
                if (h.action === "Lost") badgeColor = "#d97706";

                return (
                  <tr key={h.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={cellStyle}>
                      {new Date(h.timestamp).toLocaleString()}
                    </td>

                    <td style={cellStyle}>
                      <span
                        style={{
                          background: badgeColor,
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {h.action}
                      </span>
                    </td>

                    <td style={cellStyle}>
                      {h.scanned_by_name || "Unknown"}
                    </td>

                    <td style={cellStyle}>
                      {h.from_employee_name || h.from_branch || "-"}
                    </td>

                    <td style={cellStyle}>
                      {h.to_employee_name || h.to_branch || "-"}
                    </td>

                    <td style={cellStyle}>
                      {hasGPS ? (
                        <>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#666",
                              marginBottom: 5,
                            }}
                          >
                            {`${Number(h.latitude).toFixed(6)}, ${Number(h.longitude).toFixed(6)}`}
                          </div>

                          <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={mapLinkStyle}>View on Google Maps</a>
                        </>
                      ) : (
                        <span style={{ color: "#999" }}>No GPS</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EditRow({ field, value, options, onChange }) {
  const common = {
    value,
    onChange: (e) => onChange(e.target.value),
    style: editInputStyle,
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', gap: 16 }}>
      <label style={{ color: '#777', fontSize: 14, flexShrink: 0 }}>
        {field.label}{field.required ? ' *' : ''}
      </label>

      {field.type === 'category' ? (
        <select {...common}>
          <option value="">— None —</option>
          {options.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      ) : field.type === 'condition' ? (
        <select {...common}>
          <option value="">Not yet verified</option>
          {options.conditions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <input
          {...common}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          step={field.type === 'number' ? '0.01' : undefined}
        />
      )}
    </div>
  );
}

function Row(props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#777' }}>{props.label}</span>
      <span style={{ fontWeight: 500 }}>{props.value !== undefined && props.value !== null ? props.value : '-'}</span>
    </div>
  );
}

var sectionStyle = { background: '#f9f9f9', borderRadius: 10, padding: 20, marginBottom: 20 };
var cellStyle = { padding: '8px 10px', fontSize: 13 };
var backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' };
var dangerButtonStyle = { padding: '10px 16px', background: colors.danger, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
var warningButtonStyle = { padding: '10px 16px', background: colors.warning, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
var barcodeLinkStyle = { background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: 13, padding: 0, marginTop: 4 };
var mapLinkStyle = { color: "#2563eb", textDecoration: "none", fontWeight: 600 };
var editButtonStyle = {
  padding: '7px 14px', background: colors.primary, color: colors.white,
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
var saveButtonStyle = {
  padding: '10px 18px', background: colors.primary, color: colors.white,
  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
};
var cancelButtonStyle = {
  padding: '10px 18px', background: 'transparent', color: '#666',
  border: '1px solid ' + colors.border, borderRadius: 6, cursor: 'pointer',
};
var editInputStyle = {
  flex: 1, maxWidth: 320, padding: '7px 10px', fontSize: 14,
  border: '1px solid ' + colors.border, borderRadius: 6, background: colors.white,
};
var lockedNote = { fontSize: 12, color: '#999', marginTop: 10, lineHeight: 1.5 };
var noticeStyle = {
  background: '#eaf4ec', color: colors.success, padding: '10px 12px',
  borderRadius: 6, fontSize: 13, marginBottom: 16,
};
var errorNoticeStyle = {
  background: '#fdecea', color: colors.danger, padding: '10px 12px',
  borderRadius: 6, fontSize: 13, marginBottom: 16,
};