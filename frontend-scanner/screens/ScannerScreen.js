import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../api';

export default function ScannerScreen({ onScanSuccess, onLogout }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  console.log('Camera permission status:', permission);

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    console.log('Scanned raw data:', JSON.stringify(data));

    try {
      const response = await api.get(`/assets/${encodeURIComponent(data)}`);
      onScanSuccess(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        Alert.alert('Not found', `No asset found with code "${data}"`, [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      } else {
        Alert.alert('Error', 'Could not look up asset. Check your connection.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera access is needed to scan asset codes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <Text style={styles.instruction}>
          {loading ? 'Looking up asset...' : 'Point camera at an asset QR code'}
        </Text>
        {loading && <ActivityIndicator color="#fff" style={{ marginTop: 10 }} />}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  message: { textAlign: 'center', marginBottom: 20, fontSize: 16 },
  overlay: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    alignItems: 'center', padding: 16,
  },
  instruction: {
    color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10, borderRadius: 8, fontSize: 16,
  },
  logoutButton: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600' },
  button: {
    backgroundColor: '#1e3a5f', borderRadius: 8, padding: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});