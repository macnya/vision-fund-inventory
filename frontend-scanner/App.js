import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import ScannerScreen from './screens/ScannerScreen';
import AssetDetailScreen from './screens/AssetDetailScreen';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'scanner' | 'assetDetail'
  const [assetData, setAssetData] = useState(null);

  const handleLoginSuccess = () => setScreen('scanner');

  const handleScanSuccess = (data) => {
    setAssetData(data);
    setScreen('assetDetail');
  };

  const handleBackToScanner = () => {
    setAssetData(null);
    setScreen('scanner');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    setScreen('login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {screen === 'scanner' && (
        <ScannerScreen onScanSuccess={handleScanSuccess} onLogout={handleLogout} />
      )}
      {screen === 'assetDetail' && (
        <AssetDetailScreen assetData={assetData} onBack={handleBackToScanner} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});