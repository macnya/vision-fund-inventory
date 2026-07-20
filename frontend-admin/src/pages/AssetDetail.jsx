import { useState, useEffect } from 'react';
import { fetchAssetDetail, fetchAssetHistory, markAssetDisposed, markAssetLost } from '../api';

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

  if (loading) return <div style={{ padding: 30 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 30 }}>Asset not found.</div>;

  const asset = data.asset;
  const current_assignment = data.current_assignment;

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>Back to list</button>

      <h1 style={{ color: '#1e3a5f', marginBottom: 4 }}>{asset.asset_code}</h1>
      <p style={{ color: '#555', marginTop: 0 }}>{asset.description}</p>

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
                <th style={cellStyle}>GPS</th>
              </tr>
            </thead>
            <tbody>
              {history.map(function (h) {
                var mapUrl = 'https://www.google.com/maps?q=' + h.latitude + ',' + h.longitude;
                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={cellStyle}>{new Date(h.timestamp).toLocaleString()}</td>
                    <td style={cellStyle}>{h.action}</td>
                    <td style={cellStyle}>{h.scanned_by_name || '-'}</td>
                    <td style={cellStyle}>{h.from_employee_name || h.from_branch || '-'}</td>
                    <td style={cellStyle}>{h.to_employee_name || h.to_branch || '-'}</td>
                    <td style={cellStyle}>
                      {h.latitude && h.longitude ? (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer">View</a>
                      ) : '-'}
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
var dangerButtonStyle = { padding: '10px 16px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
var warningButtonStyle = { padding: '10px 16px', background: '#d68910', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };