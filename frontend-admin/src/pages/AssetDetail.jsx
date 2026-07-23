import { useState, useEffect } from 'react';
import { fetchAssetDetail, fetchAssetHistory, markAssetDisposed, markAssetLost } from '../api';
import { colors } from '../theme';

export default function AssetDetail({ assetCode, onBack }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
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
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [assetCode]);

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
      const response = await fetch(
        'https://vision-fund-inventory.onrender.com/assets/' + encodeURIComponent(data.asset.asset_code) + '/barcode',
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

      <h1 style={{ color: colors.white, marginBottom: 4 }}>{asset.asset_code}</h1>
      <button onClick={handlePrintBarcode} style={barcodeLinkStyle}>View / Print Barcode</button>
      <p style={{ color: '#555', marginTop: 8 }}>{asset.description}</p>

      <div style={sectionStyle}>
        <h3>Details</h3>
        <Row label="Category" value={asset.category_name} />
        <Row label="Serial Number" value={asset.serial_number} />
        <Row label="Status" value={asset.status} />
        <Row label="Condition" value={asset.condition} />
        <Row label="Purchase Date" value={asset.date_of_purchase ? asset.date_of_purchase.split('T')[0] : null} />
        <Row label="Purchase Price" value={asset.purchase_price} />
        <Row label="Supplier" value={asset.supplier} />
        <Row label="NBV" value={asset.nbv} />
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