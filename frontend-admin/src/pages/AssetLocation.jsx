import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchAssetLocations } from '../api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAssetLocations()
      .then(setAssets)
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
            (from the last scan, transfer, or verification).
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
                <Popup>
                  <div style={{ fontSize: 13, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.asset_code}</div>
                    <div style={{ marginBottom: 4 }}>{a.description}</div>
                    <div style={{ color: '#666' }}>Status: {a.status}</div>
                    {a.current_holder && <div style={{ color: '#666' }}>Holder: {a.current_holder}</div>}
                    {a.current_branch && <div style={{ color: '#666' }}>Branch: {a.current_branch}</div>}
                    <div style={{ color: '#999', marginTop: 4, fontSize: 11 }}>
                      Last recorded {new Date(a.recorded_at).toLocaleString()}
                    </div>
                    {onSelectAsset && (
                      <button
                        onClick={() => onSelectAsset(a.asset_code)}
                        style={{ marginTop: 8, padding: '4px 10px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

const panelStyle = { background: colors.white, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const searchInputStyle = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid ' + colors.border, fontSize: 13, minWidth: 260,
};