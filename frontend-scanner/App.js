import { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ScannerScreen from './screens/ScannerScreen';
import AssetDetailScreen from './screens/AssetDetailScreen';
import RecentActivityScreen from './screens/RecentActivityScreen';
import CreateAssetScreen from './screens/CreateAssetScreen';
import OfflineBanner from './components/OfflineBanner';
import { startAutoSync } from './offline/syncManager';
import { getAssetByCodeOffline } from './offline/offlineApi';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'home' | 'scanner' | 'assetDetail' | 'activity' | 'createAsset'
  const [assetData, setAssetData] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    console.log('App mounted, starting auto sync...');
    let unsubscribe;
    try {
      unsubscribe = startAutoSync();
      console.log('startAutoSync() succeeded');
    } catch (e) {
      console.log('startAutoSync() THREW:', e);
    }
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleLoginSuccess = async () => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      setUserName(user.name || '');
    }
    setScreen('home');
  };

  const handleScanSuccess = (data) => {
    setAssetData(data);
    setScreen('assetDetail');
  };

  const handleNotFound = (code) => {
    setScannedCode(code);
    setScreen('createAsset');
  };

  const handleAssetCreated = (asset) => {
    setAssetData({ asset, current_assignment: null });
    setScreen('assetDetail');
  };

  const handleSearchResult = (data) => {
    setAssetData(data);
    setScreen('assetDetail');
  };

  const handleBackToHome = () => {
    setAssetData(null);
    setScannedCode('');
    setScreen('home');
  };

  const handleRefreshAsset = async () => {
    if (!assetData?.asset?.asset_code) return;
    try {
      const { data } = await getAssetByCodeOffline(assetData.asset.asset_code);
      setAssetData(data);
    } catch {
      // If the refresh itself fails (e.g. offline with nothing cached), just
      // keep showing what we already have rather than clearing the screen.
    }
  };

  const handleLogout = async () => {
    console.log('Logout tapped');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setScreen('login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      {screen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {screen === 'home' && (
        <HomeScreen
          userName={userName}
          onScan={() => { console.log('Scan tapped'); setScreen('scanner'); }}
          onSearchResult={handleSearchResult}
          onViewActivity={() => { console.log('Activity tapped'); setScreen('activity'); }}
          onLogout={handleLogout}
        />
      )}
      {screen === 'scanner' && (
        <ScannerScreen
          onScanSuccess={handleScanSuccess}
          onNotFound={handleNotFound}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'createAsset' && (
        <CreateAssetScreen
          scannedCode={scannedCode}
          onCreated={handleAssetCreated}
          onCancel={handleBackToHome}
        />
      )}
      {screen === 'assetDetail' && (
        <AssetDetailScreen assetData={assetData} onBack={handleBackToHome} onRefresh={handleRefreshAsset} />
      )}
      {screen === 'activity' && (
        <RecentActivityScreen onBack={handleBackToHome} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});