import { useState } from 'react';
import { createUser } from '../api';

const ROLES = [
  { value: 'IT Officer',     note: 'Scans, assigns and verifies assets in the field.' },
  { value: 'IT Admin',       note: 'Full access, including editing the register and managing staff.' },
  { value: 'Branch Manager', note: 'Read-only.' },
  { value: 'Auditor',        note: 'Read-only.' },
];

export default function CreateUser({ onBack, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'IT Officer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email and password are all required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create this account.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <div className="page form-page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>‹ Back</button>

      <div className="page-head">
        <div>
          <h1 className="page-title">New staff account</h1>
          <p className="page-sub">Gives someone access to the register and the scanner app.</p>
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-body">
          <div className="field">
            <label htmlFor="u-name">Full name *</label>
            <input id="u-name" value={form.name} onChange={set('name')} />
          </div>

          <div className="field">
            <label htmlFor="u-email">Email *</label>
            <input
              id="u-email"
              type="email"
              value={form.email}
              onChange={set('email')}
              autoCapitalize="none"
              autoComplete="off"
            />
            <p className="field-hint">This is what they sign in with, on both the panel and the app.</p>
          </div>

          <div className="field">
            <label htmlFor="u-password">Password *</label>
            <input
              id="u-password"
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
            />
            <p className="field-hint">At least 6 characters. Ask them to change it after first sign-in.</p>
          </div>

          <div className="field">
            <label htmlFor="u-role">Role *</label>
            <select id="u-role" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.value}</option>)}
            </select>
            <p className="field-hint">{selectedRole?.note}</p>
          </div>
        </div>

        <div className="card-body" style={{ borderTop: '1px solid var(--rule)' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}