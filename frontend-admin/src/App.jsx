import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AssetList from './pages/AssetList';
import AssetDetail from './pages/AssetDetail';

function App() {
  const [user, setUser] = useState(null);
  const [selectedAssetCode, setSelectedAssetCode] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLoginSuccess = (userData) => setUser(userData);

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (selectedAssetCode) {
    return (
      <AssetDetail
        assetCode={selectedAssetCode}
        onBack={() => setSelectedAssetCode(null)}
      />
    );
  }

  return <AssetList onSelectAsset={setSelectedAssetCode} />;
}

export default App;