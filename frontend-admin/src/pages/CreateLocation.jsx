import { useState } from 'react';
import api from '../api';

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
      <h1 style={{ color: '#1e3a5f' }}>New Location</h1>
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}
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

const inputStyle = { display: 'block', width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' };
const submitStyle = { padding: '10px 20px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' };