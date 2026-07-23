import { useState } from 'react';
import { createUser } from '../api';
import { colors } from '../theme';

const ROLES = ['IT Admin', 'IT Officer', 'Branch Manager', 'Auditor'];

export default function CreateUser({ onBack, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('IT Officer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are all required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await createUser({ name, email, password, role });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 500, margin: '0 auto' }}>
      <button onClick={onBack} style={backButtonStyle}>← Back</button>
      <h1 style={{ color: colors.white }}>New IT Staff Account</h1>
      {error && <p style={{ color: colors.danger }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input style={inputStyle} placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={inputStyle} placeholder="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inputStyle} placeholder="Password (min 6 characters) *" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit" style={submitStyle} disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { display: 'block', width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid ' + colors.border, boxSizing: 'border-box' };
const submitStyle = { padding: '10px 20px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
const backButtonStyle = { marginBottom: 20, padding: '8px 16px', background: colors.gray, border: 'none', borderRadius: 6, cursor: 'pointer' };