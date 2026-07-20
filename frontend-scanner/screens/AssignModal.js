import { useState, useEffect } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { fetchEmployees, fetchLocations, assignAsset } from '../api';
import * as Location from 'expo-location';

export default function AssignModal({ visible, assetId, onClose, onAssigned }) {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  async function getCurrentCoords() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { latitude: null, longitude: null };
    const loc = await Location.getCurrentPositionAsync({});
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch {
    return { latitude: null, longitude: null };
  }
}

  const loadData = async () => {
    setLoading(true);
    setSelectedEmployee(null);
    setSelectedLocation(null);
    try {
      const [emps, locs] = await Promise.all([fetchEmployees(), fetchLocations()]);
      setEmployees(emps);
      setLocations(locs);
    } catch (err) {
      Alert.alert('Error', 'Failed to load employees/locations.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
  if (!selectedEmployee && !selectedLocation) {
    Alert.alert('Select something', 'Choose an employee and/or a location.');
    return;
  }

  setSubmitting(true);
  try {
    const coords = await getCurrentCoords();
    await assignAsset({
      asset_id: assetId,
      employee_id: selectedEmployee,
      location_id: selectedLocation,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    onAssigned();
  } catch (err) {
    Alert.alert('Error', err.response?.data?.error || 'Failed to assign asset.');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Assign Asset</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>Employee</Text>
            <FlatList
              data={employees}
              keyExtractor={(item) => `emp-${item.id}`}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, selectedEmployee === item.id && styles.optionSelected]}
                  onPress={() => setSelectedEmployee(item.id === selectedEmployee ? null : item.id)}
                >
                  <Text style={selectedEmployee === item.id ? styles.optionTextSelected : styles.optionText}>
                    {item.name} {item.branch ? `(${item.branch})` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <Text style={styles.sectionLabel}>Location</Text>
            <FlatList
              data={locations}
              keyExtractor={(item) => `loc-${item.id}`}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, selectedLocation === item.id && styles.optionSelected]}
                  onPress={() => setSelectedLocation(item.id === selectedLocation ? null : item.id)}
                >
                  <Text style={selectedLocation === item.id ? styles.optionTextSelected : styles.optionText}>
                    {item.branch} {item.physical_location ? `- ${item.physical_location}` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#777', marginTop: 12, marginBottom: 6 },
  list: { maxHeight: 160 },
  option: {
    padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', marginBottom: 6,
  },
  optionSelected: { backgroundColor: '#1e3a5f' },
  optionText: { color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
  cancelButton: {
    flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center',
  },
  cancelText: { color: '#333', fontWeight: '600' },
  confirmButton: {
    flex: 1, padding: 16, borderRadius: 8, backgroundColor: '#1e3a5f', alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '600' },
});