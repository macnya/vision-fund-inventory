import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchAssetLocations, fetchLocationsList, fetchEmployeesList, createAssignment } from '../api';
import { colors } from '../theme';

// Default Leaflet marker icons don't load correctly with bundlers unless
// pointed at the CDN explicitly.
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Nairobi, Kenya — sensible default center when there's no data yet.
const DEFAULT_CENTER = [-1.2921, 36.8219];

export default function AssetLocations({ onSelectAsset }) {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadAssets = () => fetchAssetLocations().then(setAssets);

  useEffect(() => {
    Promise.all([
      loadAssets(),
      fetchLocationsList().then(setLocations),
      fetchEmployeesList().then(setEmployees),
    ])
      .catch(() => setError('Failed to load asset locations.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.trim().toLowerCase();
    return assets.filter(
      (a) =>
        a.asset_code.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.current_holder || '').toLowerCase().includes(q) ||
        (a.current_branch || '').toLowerCase().includes(q)
    );
  }, [assets, search]);

  const center = filtered.length > 0
    ? [Number(filtered[0].latitude), Number(filtered[0].longitude)]
    : DEFAULT_CENTER;

  if (loading) return <div style={{ padding: 30 }}>Loading asset locations...</div>;
  if (error) return <div style={{ padding: 30, color: colors.danger }}>{error}</div>;

  return (
    <div style={{ padding: 30, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: colors.white, margin: 0 }}>Asset Locations</h1>
          <p style={{ color: colors.grayText, margin: '4px 0 0', fontSize: 13 }}>
            {assets.length} asset{assets.length === 1 ? '' : 's'} with a recorded GPS location
            (from the last scan, transfer, or verification). Click a pin to reassign branch or holder.
          </p>
        </div>
        <input
          placeholder="Search asset code, holder, branch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      {assets.length === 0 ? (
        <div style={{ ...panelStyle, textAlign: 'center', color: colors.grayText }}>
          No assets have a recorded GPS location yet. Locations are captured automatically when
          staff scan, assign, check in, or verify an asset in the mobile app (with location
          permission granted).
        </div>
      ) : (
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <MapContainer center={center} zoom={filtered.length > 0 ? 7 : 6} style={{ height: 560, width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((a) => (
              <Marker
                key={a.id}
                position={[Number(a.latitude), Number(a.longitude)]}
                icon={markerIcon}
              >
                <Popup minWidth={220}>
                  <AssetPopupContent
                    asset={a}
                    locations={locations}
                    employees={employees}
                    onSelectAsset={onSelectAsset}
                    onAssigned={loadAssets}
                  />
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

function AssetPopupContent({ asset, locations, employees, onSelectAsset, onAssigned }) {
  const [locationId, setLocationId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAssign = async () => {
    if (!locationId && !employeeId) {
      setMessage('Pick a branch or a person first.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await createAssignment({
        asset_id: asset.id,
        location_id: locationId || null,
        employee_id: employeeId || null,
        latitude: asset.latitude,
        longitude: asset.longitude,
      });
      setMessage('Updated.');
      await onAssigned();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontSize: 13, minWidth: 200 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{asset.asset_code}</div>
      <div style={{ marginBottom: 4 }}>{asset.description}</div>
      <div style={{ color: '#666' }}>Status: {asset.status}</div>
      {asset.current_holder && <div style={{ color: '#666' }}>Holder: {asset.current_holder}</div>}
      {asset.current_branch && <div style={{ color: '#666' }}>Branch: {asset.current_branch}</div>}
      <div style={{ color: '#999', marginTop: 4, fontSize: 11 }}>
        Last recorded {new Date(asset.recorded_at).toLocaleString()}
      </div>

      <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 8 }}>
        <label style={popupLabelStyle}>Move to branch</label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          style={popupSelectStyle}
        >
          <option value="">— No change —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.branch}{l.physical_location ? ' - ' + l.physical_location : ''}</option>
          ))}
        </select>

        <label style={popupLabelStyle}>Assign to</label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          style={popupSelectStyle}
        >
          <option value="">— No change —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        <button
          onClick={handleAssign}
          disabled={saving}
          style={{ marginTop: 6, width: '100%', padding: '5px 10px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          {saving ? 'Saving...' : 'Save Assignment'}
        </button>
        {message && <div style={{ marginTop: 6, fontSize: 11, color: message === 'Updated.' ? colors.success : colors.danger }}>{message}</div>}
      </div>

      {onSelectAsset && (
        <button
          onClick={() => onSelectAsset(asset.asset_code)}
          style={{ marginTop: 8, width: '100%', padding: '4px 10px', background: colors.black, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
        >
          View Details
        </button>
      )}
    </div>
  );
}

const panelStyle = { background: colors.white, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const searchInputStyle = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid ' + colors.border, fontSize: 13, minWidth: 260,
};
const popupLabelStyle = { display: 'block', fontSize: 11, color: '#888', marginTop: 6, marginBottom: 2 };
const popupSelectStyle = { width: '100%', padding: '4px 6px', fontSize: 12, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' };