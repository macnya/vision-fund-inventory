import { useState, useEffect, useCallback } from 'react';
import { fetchUsers, updateUserRole, deleteUser } from '../api';

const ROLES = ['IT Admin', 'IT Officer', 'Branch Manager', 'Auditor'];

// What each role can actually do, so whoever is granting access isn't guessing.
const ROLE_NOTE = {
  'IT Admin':       'Full access, including editing the register and managing staff.',
  'IT Officer':     'Scans, assigns and verifies assets in the field.',
  'Branch Manager': 'Read-only.',
  'Auditor':        'Read-only.',
};

export default function UserManagement({ currentUserId, onCreateNew }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);   // { kind, text }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      console.error(err);
      setNotice({ kind: 'error', text: 'Could not load staff accounts.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (id, name, newRole) => {
    setNotice(null);
    try {
      await updateUserRole(id, newRole);
      setNotice({ kind: 'ok', text: `${name} is now ${newRole}.` });
      loadUsers();
    } catch (err) {
      setNotice({ kind: 'error', text: err.response?.data?.error || 'Failed to update role.' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete the account for ${name}? This cannot be undone.`)) return;
    setNotice(null);
    try {
      await deleteUser(id);
      setNotice({ kind: 'ok', text: `${name}'s account was deleted.` });
      loadUsers();
    } catch (err) {
      setNotice({ kind: 'error', text: err.response?.data?.error || 'Failed to delete this account.' });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">IT staff</h1>
          <p className="page-sub">
            {loading ? 'Loading…' : `${users.length} account${users.length === 1 ? '' : 's'} with access to the register`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={onCreateNew}>New staff account</button>
        </div>
      </div>

      {notice && (
        <div className={notice.kind === 'ok' ? 'notice notice-ok' : 'notice notice-error'}>{notice.text}</div>
      )}

      {loading ? (
        <p className="empty">Loading staff accounts…</p>
      ) : users.length === 0 ? (
        <div className="card"><p className="empty">No staff accounts yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const role = ROLES.includes(u.role) ? u.role : 'IT Admin';
                return (
                  <tr key={u.id}>
                    <td data-label="Name">
                      {u.name}
                      {isSelf && <span className="badge badge-neutral" style={{ marginLeft: '0.5rem' }}>you</span>}
                    </td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Role">
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(u.id, u.name, e.target.value)}
                        title={ROLE_NOTE[role]}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td data-label="Joined">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td data-label="">
                      {/* Deleting your own account would lock you out mid-session. */}
                      {!isSelf && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}