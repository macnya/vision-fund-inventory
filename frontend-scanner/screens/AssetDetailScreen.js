import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { checkInOffline } from '../offline/offlineApi';
import AssignModal from './AssignModal';
import VerifyModal from './VerifyModal';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

export default function AssetDetailScreen({ assetData, onBack, onRefresh }) {
  const { asset, current_assignment, last_seen, last_holder, pendingSync } = assetData;
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const performCheckIn = async () => {
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = null, longitude = null;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      const result = await checkInOffline(asset.asset_code, current_assignment.id, { latitude, longitude });
      const message = result.queued
        ? "Saved offline — will sync automatically once you're back online."
        : 'This asset has been returned to storage.';
      Alert.alert(result.queued ? 'Saved offline' : 'Returned to Storage', message, [{ text: 'OK', onPress: onBack }]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to return this asset to storage.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckIn = () => {
    if (!current_assignment) return;
    const from = current_assignment.employee_name || current_assignment.physical_location || current_assignment.branch || 'its current holder';
    const where = [current_assignment.branch, current_assignment.physical_location].filter(Boolean).join(' — ');
    Alert.alert(
      'Return to Storage?',
      `This will return ${asset.asset_code} to storage and clear its current assignment.\n\nCurrently with: ${from}${where ? `\nLocation: ${where}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Return to Storage', style: 'default', onPress: performCheckIn },
      ]
    );
  };

  const handleAssigned = (result) => {
    setShowAssignModal(false);
    const message = result?.queued
      ? "Saved offline — will sync automatically once you're back online."
      : 'Asset assigned.';
    Alert.alert(result?.queued ? 'Saved offline' : 'Success', message, [{ text: 'OK', onPress: onBack }]);
  };

  const handleVerified = (result) => {
    setShowVerifyModal(false);
    const message = result?.queued
      ? "Saved offline — will sync automatically once you're back online."
      : 'Asset verification recorded.';
    Alert.alert(result?.queued ? 'Saved offline' : 'Success', message, [{ text: 'OK', onPress: onRefresh }]);
  };

  return (
    <ScrollView style={styles.container}>
      {pendingSync && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>Showing offline data — some changes not yet synced</Text>
        </View>
      )}

      <Text style={styles.code}>{asset.asset_code}</Text>
      <Text style={styles.description}>{asset.description}</Text>

      <View style={styles.section}>
        <Row label="Category" value={asset.category_name} />
        <Row label="Serial Number" value={asset.serial_number} />
        {/* Vehicles only — an officer next to a motorcycle needs these to
            match it against its logbook. */}
        {asset.chassis_number ? <Row label="Chassis No" value={asset.chassis_number} /> : null}
        {asset.engine_number ? <Row label="Engine No" value={asset.engine_number} /> : null}
        <Row label="Status" value={asset.status} />
        <Row label="Condition" value={asset.condition || 'Not yet verified'} />
        <Row label="Purchase Price" value={asset.purchase_price} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Assignment</Text>
        {current_assignment ? (
          <>
            <Row label="Employee" value={current_assignment.employee_name || 'Held by location, not a person'} />
            {current_assignment.employee_department ? (
              <Row label="Department" value={current_assignment.employee_department} />
            ) : null}
            <Row label="Branch" value={current_assignment.branch || current_assignment.employee_branch || '—'} />
            <Row label="Location" value={current_assignment.physical_location || '—'} />
          </>
        ) : last_holder ? (
          <>
            <Text style={styles.noAssignment}>Not currently assigned</Text>
            <Row label="Last held by" value={last_holder.employee_name || last_holder.physical_location || last_holder.branch || '—'} />
            <Row
              label="Returned"
              value={last_holder.returned_date ? new Date(last_holder.returned_date).toLocaleDateString() : '—'}
            />
          </>
        ) : (
          <Text style={styles.noAssignment}>Not currently assigned</Text>
        )}
      </View>

      {/* Where the asset was physically last seen, as opposed to where the
          register says it belongs. Pulled from the newest scan or verification
          that captured GPS. */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Seen</Text>
        {last_seen ? (
          <>
            <Row label="When" value={new Date(last_seen.recorded_at).toLocaleString()} />
            <Row label="During" value={last_seen.source} />
            <Row
              label="Coordinates"
              value={`${Number(last_seen.latitude).toFixed(5)}, ${Number(last_seen.longitude).toFixed(5)}`}
            />
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => Linking.openURL(last_seen.map_url)}
            >
              <Text style={styles.mapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.noAssignment}>No GPS recorded yet — verify or assign this asset to capture one.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.verifyButton} onPress={() => setShowVerifyModal(true)}>
        <Text style={styles.actionButtonText}>Verify Asset</Text>
      </TouchableOpacity>

      {current_assignment ? (
        <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn} disabled={checkingIn}>
          {checkingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>📦  Return to Storage</Text>}
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
        assetCode={asset.asset_code}
        assetId={asset.id}
        onClose={() => setShowAssignModal(false)}
        onAssigned={handleAssigned}
      />

      <VerifyModal
        visible={showVerifyModal}
        assetCode={asset.asset_code}
        onClose={() => setShowVerifyModal(false)}
        onVerified={handleVerified}
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
  pendingBanner: {
    backgroundColor: '#c98a1d', borderRadius: 8, padding: 10, marginBottom: 14,
  },
  pendingBannerText: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
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
  mapButton: {
    marginTop: 10, backgroundColor: '#2563eb', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  mapButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  verifyButton: {
    backgroundColor: '#b8590c', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 12,
  },
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