import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AssetList from './pages/AssetList';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleSelectAsset = (assetCode) => {
    alert(`Detail view for ${assetCode} coming next`);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <AssetList onSelectAsset={handleSelectAsset} />;
}

export default App;