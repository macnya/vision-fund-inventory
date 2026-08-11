import { useState, useEffect } from 'react';
import { fetchUsers, updateUserRole, deleteUser } from '../api';
import { colors } from '../theme';

const ROLES = ['IT Admin', 'IT Officer', 'Branch Manager', 'Auditor'];

export default function UserManagement({ currentUserId, onCreateNew }) {  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  loadUsers();
}, []);

  const handleRoleChange = async (id, newRole) => {
    try {
      await updateUserRole(id, newRole);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm('Delete user "' + name + '"? This cannot be undone.')) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  if (loading) return <div style={{ padding: 30 }}>Loading users...</div>;

  return (
  <div style={{ padding: 30, maxWidth: 900, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 style={{ color: colors.ink }}>IT Staff Management</h1>
      <button onClick={onCreateNew} style={newButtonStyle}>+ New Staff</button>
    </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ textAlign: 'left', background: colors.gray }}>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>Email</th>
            <th style={cellStyle}>Role</th>
            <th style={cellStyle}>Joined</th>
            <th style={cellStyle}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={cellStyle}>{u.name}{isSelf ? ' (you)' : ''}</td>
                <td style={cellStyle}>{u.email}</td>
                <td style={cellStyle}>
                  <select
                    value={ROLES.includes(u.role) ? u.role : 'IT Admin'}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={selectStyle}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td style={cellStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={cellStyle}>
                  {!isSelf && (
                    <button onClick={() => handleDelete(u.id, u.name)} style={deleteButtonStyle}>
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
  );
}

const cellStyle = { padding: '10px 12px', fontSize: 14 };
const selectStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid ' + colors.border };
const deleteButtonStyle = { padding: '6px 12px', background: colors.danger, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const newButtonStyle = { padding: '10px 16px', background: colors.success, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };