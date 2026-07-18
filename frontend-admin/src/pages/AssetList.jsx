import { useState, useEffect } from 'react';
import api from '../api';

export default function AssetList({ onSelectAsset }) {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [status]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get('/assets', { params });
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAssets();
  };

  return (
    <div style={{ padding: 30, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ color: '#1e3a5f' }}>Vision Fund Assets</h1>

      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          placeholder="Search by code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Assigned">Assigned</option>
          <option value="Under Repair">Under Repair</option>
          <option value="Disposed">Disposed</option>
          <option value="Lost">Lost</option>
        </select>
        <button type="submit" style={{ padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6 }}>
          Search
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f5f7', textAlign: 'left' }}>
              <th style={cellStyle}>Asset Code</th>
              <th style={cellStyle}>Description</th>
              <th style={cellStyle}>Category</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Assigned To</th>
              <th style={cellStyle}>Branch</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                onClick={() => onSelectAsset(asset.asset_code)}
              >
                <td style={cellStyle}>{asset.asset_code}</td>
                <td style={cellStyle}>{asset.description}</td>
                <td style={cellStyle}>{asset.category_name}</td>
                <td style={cellStyle}>{asset.status}</td>
                <td style={cellStyle}>{asset.employee_name || '—'}</td>
                <td style={cellStyle}>{asset.branch || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && assets.length === 0 && <p>No assets found.</p>}
      {!loading && assets.length === 200 && (
        <p style={{ color: '#888', fontSize: 13 }}>Showing first 200 results — refine your search for more specific results.</p>
      )}
    </div>
  );
}

const cellStyle = { padding: '10px 12px', fontSize: 14 };