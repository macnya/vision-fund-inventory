import { useState } from 'react';
import api from '../api';
import { colors } from '../theme';

export default function CreateLocation({ onBack, onCreated }) {
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!branch.trim()) {
      setError('Branch is required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/locations', { branch, department, physical_location: physicalLocation });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 500, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>← Back</button>
      <h1 style={{ color: colors.ink }}>New Location</h1>
      {error && <p style={{ color: colors.danger }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input style={inputStyle} placeholder="Branch *" value={branch} onChange={(e) => setBranch(e.target.value)} />
        <input style={inputStyle} placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        <input style={inputStyle} placeholder="Physical location (room, desk, etc.)" value={physicalLocation} onChange={(e) => setPhysicalLocation(e.target.value)} />
        <button type="submit" style={submitStyle} disabled={loading}>
          {loading ? 'Saving...' : 'Create Location'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { display: 'block', width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid ' + colors.border, boxSizing: 'border-box' };
const submitStyle = { padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
const backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: colors.gray, border: 'none', borderRadius: 6, cursor: 'pointer' };