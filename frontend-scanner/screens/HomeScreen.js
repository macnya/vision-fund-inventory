import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { getAssetByCodeOffline } from '../offline/offlineApi';
import { c, mono } from '../theme';

export default function HomeScreen({ userName, onScan, onSearchResult, onViewActivity, onAsk, onLogout }) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);

  const closeSearch = () => {
    setShowSearchModal(false);
    setSearchCode('');
  };

  const handleManualSearch = async () => {
    if (!searchCode.trim()) return;
    setSearching(true);
    try {
      const { data, fromCache } = await getAssetByCodeOffline(searchCode.trim());
      closeSearch();
      if (fromCache) {
        Alert.alert('Offline copy', 'Showing the last data saved on this phone.', [{ text: 'OK' }]);
      }
      onSearchResult(data);
    } catch (err) {
      if (err.response?.status === 404) {
        Alert.alert('Not in the register', `No asset with the code ${searchCode.trim()}.`);
      } else {
        Alert.alert(
          'Not available offline',
          "This asset hasn't been opened on this phone before, so there's no saved copy to show."
        );
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <View style={s.screen}>
      <View style={s.body}>
        <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />

        <Text style={s.greeting}>{userName ? `Hello, ${userName.split(' ')[0]}` : 'Hello'}</Text>
        <Text style={s.subtitle}>Asset Scanner</Text>

        <TouchableOpacity style={s.primary} onPress={onScan} activeOpacity={0.85}>
          <Text style={s.primaryText}>Scan a barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondary} onPress={() => setShowSearchModal(true)} activeOpacity={0.7}>
          <Text style={s.secondaryText}>Search by asset code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondary} onPress={onViewActivity} activeOpacity={0.7}>
          <Text style={s.secondaryText}>Recent activity</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondary} onPress={onAsk} activeOpacity={0.7}>
          <Text style={s.secondaryText}>Ask about the register</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.logout} onPress={onLogout}>
        <Text style={s.logoutText}>Log out</Text>
      </TouchableOpacity>

      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent
        onRequestClose={closeSearch}   /* Android back closes the sheet */
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Search by asset code</Text>
            <Text style={s.sheetHint}>Type the code printed on the label.</Text>

            <TextInput
              style={s.input}
              placeholder="e.g. KDT000487"
              placeholderTextColor={c.inkFaint}
              value={searchCode}
              onChangeText={setSearchCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleManualSearch}
            />

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancel} onPress={closeSearch}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirm} onPress={handleManualSearch} disabled={searching}>
                {searching
                  ? <ActivityIndicator color={c.paper} />
                  : <Text style={s.confirmText}>Search</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper, paddingHorizontal: 24 },
  body: { flex: 1, justifyContent: 'center' },

  logo: { width: 190, height: 49, alignSelf: 'center', marginBottom: 28 },
  greeting: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: c.ink },
  subtitle: {
    fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase',
    color: c.inkFaint, textAlign: 'center', fontWeight: '700', marginTop: 6, marginBottom: 38,
  },

  primary: {
    backgroundColor: c.orange, borderRadius: 12,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  primaryText: { color: c.paper, fontSize: 17, fontWeight: '700' },

  secondary: {
    backgroundColor: c.paper, borderRadius: 12, borderWidth: 1.5, borderColor: c.rule,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  secondaryText: { color: c.ink, fontSize: 15, fontWeight: '600' },

  logout: { alignItems: 'center', paddingVertical: 18 },
  logoutText: { color: c.inkSoft, fontSize: 14, fontWeight: '500' },

  overlay: { flex: 1, backgroundColor: 'rgba(20,24,31,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 30,
  },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: c.ink },
  sheetHint: { fontSize: 13, color: c.inkSoft, marginTop: 4, marginBottom: 16 },

  // color and backgroundColor are explicit: Android tints input text for the
  // system theme, and against a hardcoded white sheet that made typed
  // characters invisible.
  input: {
    borderWidth: 1, borderColor: c.rule, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 17,
    fontFamily: mono, letterSpacing: 0.5,
    color: c.ink, backgroundColor: c.paper,
  },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancel: {
    flex: 1, paddingVertical: 15, borderRadius: 12,
    borderWidth: 1.5, borderColor: c.rule, alignItems: 'center', backgroundColor: c.paper,
  },
  cancelText: { color: c.inkSoft, fontSize: 15, fontWeight: '600' },
  confirm: {
    flex: 1, paddingVertical: 15, borderRadius: 12,
    backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { color: c.paper, fontSize: 15, fontWeight: '700' },
});