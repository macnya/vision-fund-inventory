import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';
import CreateEmployee from './pages/CreateEmployee';
import CreateLocation from './pages/CreateLocation';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'newEmployee' | 'newLocation'
  const [selectedAssetCode, setSelectedAssetCode] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLoginSuccess = (userData) => setUser(userData);

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (view === 'detail') {
    return (
      <AssetDetail
        assetCode={selectedAssetCode}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'newEmployee') {
    return (
      <CreateEmployee
        onBack={() => setView('list')}
        onCreated={() => { alert('Employee created'); setView('list'); }}
      />
    );
  }

  if (view === 'newLocation') {
    return (
      <CreateLocation
        onBack={() => setView('list')}
        onCreated={() => { alert('Location created'); setView('list'); }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, padding: '20px 30px 0' }}>
        <button style={navButtonStyle} onClick={() => setView('newEmployee')}>+ New Employee</button>
        <button style={navButtonStyle} onClick={() => setView('newLocation')}>+ New Location</button>
      </div>
      <AssetList onSelectAsset={(code) => { setSelectedAssetCode(code); setView('detail'); }} />
    </div>
  );
}

const navButtonStyle = { padding: '8px 16px', background: '#2d7a4f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };

export default App;