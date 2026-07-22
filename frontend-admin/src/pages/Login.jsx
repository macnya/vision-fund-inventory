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
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img src={logo} alt="Vision Fund" style={{ height: 60 }} />
        </div>
        <h1 style={styles.title}>Asset Dashboard</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: colors.black },
  form: { background: colors.white, padding: 40, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.3)', width: 320 },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 24, color: colors.black },
  input: { display: 'block', width: '100%', padding: 12, marginBottom: 14, borderRadius: 8, border: '1px solid ' + colors.border, boxSizing: 'border-box' },
  button: { width: '100%', padding: 12, background: colors.primary, color: colors.white, border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 600 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 10 },
};