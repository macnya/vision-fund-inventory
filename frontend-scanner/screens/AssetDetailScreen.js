import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function AssetDetailScreen({ assetData, onBack }) {
  const { asset, current_assignment } = assetData;

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

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Scan Next Asset</Text>
      </TouchableOpacity>
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
  backButton: {
    backgroundColor: '#1e3a5f', borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 10, marginBottom: 40,
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});