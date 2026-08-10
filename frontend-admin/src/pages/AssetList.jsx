import { useState, useEffect, useCallback } from 'react';
import { fetchAssets } from '../api';
import { colors } from '../theme';

const PAGE_SIZE = 50;

// Only these are ever written by the backend (assignment, check-in, disposal,
// loss). "Under Repair" used to be offered here and could never match a row.
const STATUS_OPTIONS = ['In Stock', 'Assigned', 'Disposed', 'Lost'];

export default function AssetList({ onSelectAsset, initialStatus = '' }) {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAssets({
        search: activeSearch,
        status,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setAssets(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not load assets. Please try again.');
      setAssets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeSearch, status]);

  useEffect(() => {
    // Fetch-on-mount. The rule objects because loadAssets sets loading state
    // before its first await, but that's inherent to showing a spinner while
    // fetching — there's no external system to synchronise with here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssets();
  }, [loadAssets]);
  const loadMore = async () => {
    setLoadingMore(true);
    setError('');
    try {
      const result = await fetchAssets({
        search: activeSearch,
        status,
        limit: PAGE_SIZE,
        offset: assets.length,
      });
      setAssets((prev) => [...prev, ...result.data]);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not load more assets.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(search.trim());
  };

  const hasMore = assets.length < total;

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
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" style={{ padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <p style={{ color: colors.white }}>Loading...</p>
      ) : (
        <>
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
              {assets.map((a) => (
                <tr
                  key={a.id}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onClick={() => onSelectAsset(a.asset_code)}
                >
                  <td style={cellStyle}>{a.asset_code}</td>
                  <td style={cellStyle}>{a.description}</td>
                  <td style={cellStyle}>{a.category_name}</td>
                  <td style={cellStyle}>{a.status}</td>
                  <td style={cellStyle}>{a.employee_name || '—'}</td>
                  <td style={cellStyle}>{a.branch || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {assets.length === 0 && !error && <p style={{ color: colors.white }}>No assets found.</p>}

          {assets.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ color: '#bbb', fontSize: 13 }}>
                Showing {assets.length} of {total}
              </span>
              {hasMore && (
                <button onClick={loadMore} disabled={loadingMore} style={loadMoreStyle}>
                  {loadingMore ? 'Loading...' : `Load next ${Math.min(PAGE_SIZE, total - assets.length)}`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const cellStyle = { padding: '10px 12px', fontSize: 14 };
const loadMoreStyle = {
  padding: '8px 16px',
  background: colors.primary,
  color: colors.white,
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};
const errorStyle = {
  background: '#fdecea',
  color: colors.danger,
  padding: '10px 12px',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 16,
};