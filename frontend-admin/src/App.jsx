import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import CreateEmployee from './pages/CreateEmployee';
import CreateLocation from './pages/CreateLocation';
import UserManagement from './pages/UserManagement';
import logo from './assets/logo.png';
import { colors } from './theme';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'list' | 'detail' | 'newEmployee' | 'newLocation' | 'users'
  const [selectedAssetCode, setSelectedAssetCode] = useState(null);
  const [listInitialStatus, setListInitialStatus] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLoginSuccess = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  let content;
  if (view === 'detail') {
    content = (
      <AssetDetail
        assetCode={selectedAssetCode}
        onBack={() => setView('list')}
      />
    );
  } else if (view === 'newEmployee') {
    content = (
      <CreateEmployee
        onBack={() => setView('list')}
        onCreated={() => { alert('Employee created'); setView('list'); }}
      />
    );
  } else if (view === 'newLocation') {
    content = (
      <CreateLocation
        onBack={() => setView('list')}
        onCreated={() => { alert('Location created'); setView('list'); }}
      />
    );
  } else if (view === 'users') {
    content = <UserManagement currentUserId={user.id} />;
  } else if (view === 'list') {
    content = (
      <div>
        <div style={{ display: 'flex', gap: 10, padding: '20px 30px 0' }}>
          <button style={navButtonStyle} onClick={() => setView('newEmployee')}>+ New Employee</button>
          <button style={navButtonStyle} onClick={() => setView('newLocation')}>+ New Location</button>
        </div>
        <AssetList
          onSelectAsset={(code) => { setSelectedAssetCode(code); setView('detail'); }}
          initialStatus={listInitialStatus}
        />
      </div>
    );
  } else {
    content = (
      <Dashboard
        onNavigate={(targetView, status) => {
          setListInitialStatus(status || '');
          setView(targetView);
        }}
      />
    );
  }

  return (
    <div>
      <div style={topNavStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <img src={logo} alt="Vision Fund" style={{ height: 36 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={tabStyle(view === 'dashboard')} onClick={() => setView('dashboard')}>Dashboard</button>
            <button style={tabStyle(view === 'list')} onClick={() => setView('list')}>Assets</button>
            <button style={tabStyle(view === 'users')} onClick={() => setView('users')}>IT Staff</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: colors.grayText }}>{user.name}</span>
          <button style={logoutButtonStyle} onClick={handleLogout}>Log Out</button>
        </div>
      </div>
      {content}
    </div>
  );
}

function tabStyle(active) {
  return {
    padding: '8px 16px',
    background: active ? colors.primary : colors.gray,
    color: active ? colors.white : colors.black,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  };
}

const navButtonStyle = { padding: '8px 16px', background: colors.success, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' };
const topNavStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 30px', borderBottom: '2px solid ' + colors.primary, background: colors.black };
const logoutButtonStyle = { padding: '6px 12px', background: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };

export default App;