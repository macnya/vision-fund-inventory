import { useState, useEffect } from 'react';
import { fetchAssetDetail, fetchAssetHistory } from '../api';

export default function AssetDetail({ assetCode, onBack }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [assetCode]);

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

  if (loading) return <div style={{ padding: 30 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 30 }}>Asset not found.</div>;

  const { asset, current_assignment } = data;

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>← Back to list</button>

      <h1 style={{ color: '#1e3a5f', marginBottom: 4 }}>{asset.asset_code}</h1>
      <p style={{ color: '#555', marginTop: 0 }}>{asset.description}</p>

      <div style={sectionStyle}>
        <h3>Details</h3>
        <Row label="Category" value={asset.category_name} />
        <Row label="Serial Number" value={asset.serial_number} />
        <Row label="Status" value={asset.status} />
        <Row label="Condition" value={asset.condition} />
        <Row label="Purchase Date" value={asset.date_of_purchase?.split('T')[0]} />
        <Row label="Purchase Price" value={asset.purchase_price} />
        <Row label="Supplier" value={asset.supplier} />
        <Row label="NBV" value={asset.nbv} />
      </div>

      <div style={sectionStyle}>
        <h3>Current Assignment</h3>
        {current_assignment ? (
          <>
            <Row label="Employee" value={current_assignment.employee_name || '—'} />
            <Row label="Branch" value={current_assignment.branch || '—'} />
            <Row label="Location" value={current_assignment.physical_location || '—'} />
          </>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>Not currently assigned</p>
        )}
      </div>

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
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={cellStyle}>{new Date(h.timestamp).toLocaleString()}</td>
                  <td style={cellStyle}>{h.action}</td>
                  <td style={cellStyle}>{h.scanned_by_name || '—'}</td>
                  <td style={cellStyle}>{h.from_employee_name || h.from_branch || '—'}</td>
                  <td style={cellStyle}>{h.to_employee_name || h.to_branch || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  );
}

const sectionStyle = { background: '#f9f9f9', borderRadius: 10, padding: 20, marginBottom: 20 };
const cellStyle = { padding: '8px 10px', fontSize: 13 };
const backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' };