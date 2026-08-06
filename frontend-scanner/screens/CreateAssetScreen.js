import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { fetchCategories, createAsset } from '../api';
import { ASSET_CONDITIONS, DEFAULT_CONDITION } from '../constants/assetConditions';

export default function CreateAssetScreen({ scannedCode, onCreated, onCancel }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [condition, setCondition] = useState(DEFAULT_CONDITION);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId(String(cats[0].id));
      })
      .catch(() => Alert.alert('Error', 'Could not load categories.'))
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing info', 'Please enter a description.');
      return;
    }
    setLoading(true);
    try {
      const asset = await createAsset({
        asset_code: scannedCode,
        description: description.trim(),
        asset_category_id: categoryId ? parseInt(categoryId, 10) : null,
        serial_number: serialNumber || null,
        supplier: supplier || null,
        condition,
      });
      onCreated(asset);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create asset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Add New Asset</Text>
      <Text style={styles.codeLabel}>Scanned Code</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{scannedCode}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Description *"
        value={description}
        onChangeText={setDescription}
      />

      {loadingCategories ? (
        <ActivityIndicator style={{ marginBottom: 12 }} />
      ) : (
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={String(c.id)} />
            ))}
          </Picker>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Serial Number"
        value={serialNumber}
        onChangeText={setSerialNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Supplier"
        value={supplier}
        onChangeText={setSupplier}
      />

      {/* Driven by the shared list rather than hardcoded. This picker used to
          offer "Fair", which the backend rejects and no verification could
          ever produce — the last place that value could still be created. */}
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={condition} onValueChange={setCondition}>
          {ASSET_CONDITIONS.map((c) => (
            <Picker.Item key={c} label={c} value={c} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create Asset</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  codeLabel: { fontSize: 12, color: '#777', marginBottom: 4 },
  codeBox: { backgroundColor: '#f4f4f4', borderRadius: 8, padding: 12, marginBottom: 16 },
  codeText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 16 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 14 },
  submitButton: { backgroundColor: '#E8720C', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelButtonText: { color: '#999', fontSize: 14 },
});