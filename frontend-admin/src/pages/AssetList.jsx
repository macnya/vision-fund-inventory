import { useState, useEffect, useCallback } from 'react';
import { fetchAssets, fetchAssetFilters } from '../api';
import { colors } from '../theme';

const PAGE_SIZE = 50;

const SORTS = [
  { value: 'code', label: 'Asset code' },
  { value: 'newest', label: 'Recently added' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'value', label: 'Highest value' },
  { value: 'description', label: 'Description A–Z' },
];

const EMPTY = { search: '', status: '', category: '', branch: '', assigned: '', sort: 'code' };

export default function AssetList({ onSelectAsset, initialStatus = '' }) {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState({ categories: [], branches: [], statuses: [] });

  // `search` is what's in the box; `filters.search` is what's been submitted.
  // Without that split every keystroke would refire the request and reset paging.
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ ...EMPTY, status: initialStatus });

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssetFilters()
      .then(setOptions)
      .catch(() => { /* filter bar degrades to text search; not worth an error banner */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAssets({ ...filters, limit: PAGE_SIZE, offset: 0 });
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
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError('');
    try {
      const result = await fetchAssets({ ...filters, limit: PAGE_SIZE, offset: assets.length });
      setAssets((prev) => [...prev, ...result.data]);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not load more assets.');
    } finally {
      setLoadingMore(false);
    }
  };

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const submitSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: search.trim() }));
  };

  const clearAll = () => {
    setSearch('');
    setFilters({ ...EMPTY });
  };

  const activeCount = Object.entries(filters)
    .filter(([k, v]) => k !== 'sort' && v).length;

  const hasMore = assets.length < total;

  return (
    <div style={{ padding: 30, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ color: colors.white, marginBottom: 16 }}>Vision Fund Assets</h1>

      <form onSubmit={submitSearch} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid ' + colors.border }}
          placeholder="Search by code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" style={primaryButton}>Search</button>
      </form>

      <div style={filterBar}>
        <Select value={filters.status} onChange={set('status')} label="All statuses">
          {options.statuses.map((v) => <option key={v} value={v}>{v}</option>)}
        </Select>

        <Select value={filters.category} onChange={set('category')} label="All categories">
          {options.categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </Select>

        <Select value={filters.branch} onChange={set('branch')} label="All branches">
          {options.branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>

        <Select value={filters.assigned} onChange={set('assigned')} label="Assigned or not">
          <option value="yes">Assigned to someone</option>
          <option value="no">Not assigned</option>
        </Select>

        <Select value={filters.sort} onChange={set('sort')}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>

        {activeCount > 0 && (
          <button onClick={clearAll} style={clearButton}>
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </button>
        )}
      </div>

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

          {assets.length === 0 && !error && (
            <p style={{ color: colors.white }}>
              {activeCount > 0
                ? 'No assets match these filters.'
                : 'No assets found.'}
            </p>
          )}

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

function Select({ value, onChange, label, children }) {
  return (
    <select value={value} onChange={onChange} style={selectStyle}>
      {label && <option value="">{label}</option>}
      {children}
    </select>
  );
}

const cellStyle = { padding: '10px 12px', fontSize: 14 };
const primaryButton = {
  padding: '10px 20px', background: colors.primary, color: colors.white,
  border: 'none', borderRadius: 6, cursor: 'pointer',
};
const filterBar = {
  display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20,
};
const selectStyle = {
  padding: '8px 10px', borderRadius: 6, border: '1px solid ' + colors.border,
  fontSize: 13, background: colors.white, cursor: 'pointer',
};
const clearButton = {
  padding: '8px 14px', borderRadius: 6, border: 'none',
  background: colors.black, color: colors.white, fontSize: 13, cursor: 'pointer',
};
const loadMoreStyle = {
  padding: '8px 16px', background: colors.primary, color: colors.white,
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const errorStyle = {
  background: '#fdecea', color: colors.danger, padding: '10px 12px',
  borderRadius: 6, fontSize: 13, marginBottom: 16,
};