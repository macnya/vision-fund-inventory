import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { checkInAssignment } from '../api';
import AssignModal from './AssignModal';

export default function AssetDetailScreen({ assetData, onBack, onRefresh }) {
  const { asset, current_assignment } = assetData;
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    if (!current_assignment) return;
    setCheckingIn(true);
    try {
      await checkInAssignment(current_assignment.id);
      Alert.alert('Success', 'Asset checked in.', [{ text: 'OK', onPress: onBack }]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to check in asset.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleAssigned = () => {
    setShowAssignModal(false);
    Alert.alert('Success', 'Asset assigned.', [{ text: 'OK', onPress: onBack }]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.code}>{asset.asset_code}</Text>
      <Text style={styles.description}>{asset.description}</Text>

      <View style={styles.section}>
        <Row label="Category" value={asset.category_name} />
        <Row label="Serial Number" value={asset.serial_number} />
        <Row label="Status" value={asset.status} />
        <Row label="Condition" value={asset.condition} />
        <Row label="Purchase Price" value={asset.purchase_price} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Assignment</Text>
        {current_assignment ? (
          <>
            <Row label="Employee" value={current_assignment.employee_name || '—'} />
            <Row label="Branch" value={current_assignment.branch || '—'} />
            <Row label="Location" value={current_assignment.physical_location || '—'} />
          </>
        ) : (
          <Text style={styles.noAssignment}>Not currently assigned</Text>
        )}
      </View>

      {current_assignment ? (
        <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn} disabled={checkingIn}>
          {checkingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Check In</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowAssignModal(true)}>
          <Text style={styles.actionButtonText}>Assign / Transfer</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Scan Next Asset</Text>
      </TouchableOpacity>

      <AssignModal
        visible={showAssignModal}
        assetId={asset.id}
        onClose={() => setShowAssignModal(false)}
        onAssigned={handleAssigned}
      />
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  code: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  description: { fontSize: 16, color: '#555', marginBottom: 20 },
  section: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 16, marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e5e5',
  },
  label: { color: '#777' },
  value: { fontWeight: '500' },
  noAssignment: { color: '#999', fontStyle: 'italic' },
  actionButton: {
    backgroundColor: '#2d7a4f', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 4,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: {
    backgroundColor: '#1e3a5f', borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 12, marginBottom: 40,
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});