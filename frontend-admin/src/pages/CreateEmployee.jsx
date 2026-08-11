import { useState } from 'react';
import api from '../api';
import { colors } from '../theme';

export default function CreateEmployee({ onBack, onCreated }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/employees', { name, department, branch, email });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create employee.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 500, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>← Back</button>
      <h1 style={{ color: colors.ink }}>New Employee</h1>
      {error && <p style={{ color: colors.danger }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input style={inputStyle} placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={inputStyle} placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        <input style={inputStyle} placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        <input style={inputStyle} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" style={submitStyle} disabled={loading}>
          {loading ? 'Saving...' : 'Create Employee'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { display: 'block', width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid ' + colors.border, boxSizing: 'border-box' };
const submitStyle = { padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
const backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: colors.gray, border: 'none', borderRadius: 6, cursor: 'pointer' };