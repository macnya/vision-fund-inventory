import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import api from '../api';

export default function HomeScreen({ userName, onScan, onSearchResult, onViewActivity, onLogout }) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);

  const handleManualSearch = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    try {
      const response = await api.get(`/assets/${encodeURIComponent(searchCode.trim())}`);
      setShowSearchModal(false);
      setSearchCode('');
      onSearchResult(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        Alert.alert('Not found', `No asset found with code "${searchCode}"`);
      } else {
        Alert.alert('Error', 'Could not look up asset. Check your connection.');
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.greeting}>Hello, {userName}</Text>
      <Text style={styles.subtitle}>Vision Fund Asset Scanner</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={onScan}>
        <Text style={styles.primaryButtonText}>📷  Scan Barcode</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowSearchModal(true)}>
        <Text style={styles.secondaryButtonText}>🔍  Search by Asset Code</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onViewActivity}>
        <Text style={styles.secondaryButtonText}>🕒  Recent Activity</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>

      <Modal visible={showSearchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Search by Asset Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. KDT000487"
              value={searchCode}
              onChangeText={setSearchCode}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setShowSearchModal(false); setSearchCode(''); }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleManualSearch} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Search</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  logo: { width: 180, height: 47, alignSelf: 'center', marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 40 },
  primaryButton: { backgroundColor: '#E8720C', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 14 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#f4f4f4', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 14 },
  secondaryButtonText: { color: '#1a1a1a', fontSize: 16 },
  logoutButton: { marginTop: 20, alignItems: 'center' },
  logoutButtonText: { color: '#c0392b', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalButtonRow: { flexDirection: 'row', gap: 10 },
  modalCancelButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  modalConfirmButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#E8720C', alignItems: 'center' },
});