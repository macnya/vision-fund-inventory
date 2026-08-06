import { useState } from 'react';
import api from '../api';
import { colors } from '../theme';
import logo from '../assets/logo.png';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapperStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src={logo} alt="Vision Fund" style={{ height: 50 }} />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: colors.black }}>IT Staff Login</h2>

        {error && <div style={errorStyle}>{error}</div>}

        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

const wrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: colors.gray,
};
const formStyle = {
  background: colors.white,
  padding: '32px 36px',
  borderRadius: 10,
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  width: 340,
};
const labelStyle = { display: 'block', fontSize: 13, marginBottom: 6, color: colors.grayText };
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: 16,
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};
const buttonStyle = {
  width: '100%',
  padding: '12px',
  background: colors.primary,
  color: colors.white,
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
const errorStyle = {
  background: '#fdecea',
  color: colors.danger,
  padding: '10px 12px',
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 16,
};