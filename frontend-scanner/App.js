import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ScannerScreen from './screens/ScannerScreen';
import AssetDetailScreen from './screens/AssetDetailScreen';
import RecentActivityScreen from './screens/RecentActivityScreen';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'home' | 'scanner' | 'assetDetail' | 'activity'
  const [assetData, setAssetData] = useState(null);
  const [userName, setUserName] = useState('');

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

  const handleSearchResult = (data) => {
    setAssetData(data);
    setScreen('assetDetail');
  };

  const handleBackToHome = () => {
    setAssetData(null);
    setScreen('home');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setScreen('login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {screen === 'home' && (
        <HomeScreen
          userName={userName}
          onScan={() => setScreen('scanner')}
          onSearchResult={handleSearchResult}
          onViewActivity={() => setScreen('activity')}
          onLogout={handleLogout}
        />
      )}
      {screen === 'scanner' && (
        <ScannerScreen onScanSuccess={handleScanSuccess} onBack={() => setScreen('home')} />
      )}
      {screen === 'assetDetail' && (
        <AssetDetailScreen assetData={assetData} onBack={handleBackToHome} />
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