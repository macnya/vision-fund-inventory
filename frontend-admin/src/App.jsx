import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import CreateEmployee from './pages/CreateEmployee';
import CreateLocation from './pages/CreateLocation';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'list' | 'detail' | 'newEmployee' | 'newLocation'
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabStyle(view === 'dashboard')} onClick={() => setView('dashboard')}>Dashboard</button>
          <button style={tabStyle(view === 'list')} onClick={() => setView('list')}>Assets</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#555' }}>{user.name}</span>
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
    background: active ? '#1e3a5f' : '#eee',
    color: active ? '#fff' : '#333',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  };
}

const navButtonStyle = { padding: '8px 16px', background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
const topNavStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 30px', borderBottom: '1px solid #eee', background: '#fafafa' };
const logoutButtonStyle = { padding: '6px 12px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };

export default App;