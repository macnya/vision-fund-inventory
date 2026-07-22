import { useState, useEffect } from 'react';
import api from '../api';
import { colors } from '../theme';

export default function AssetList({ onSelectAsset, initialStatus = '' }) {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadAssets();
  }, [status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAssets();
  };

  return (
    <div style={{ padding: 30, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ color: colors.white }}>Vision Fund Assets</h1>
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid ' + colors.border }}
          placeholder="Search by code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ padding: 10, borderRadius: 6, border: '1px solid ' + colors.border }}
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
        <button type="submit" style={{ padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: colors.gray, textAlign: 'left' }}>
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