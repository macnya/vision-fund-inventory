import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getTotalPendingCount } from '../offline/syncManager';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(!!(state.isConnected && state.isInternetReachable !== false));
      setPending(getTotalPendingCount());
    });
    const interval = setInterval(() => setPending(getTotalPendingCount()), 3000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <View style={[styles.banner, !online ? styles.offline : styles.syncing]}>
      <Text style={styles.text}>
        {!online
          ? pending > 0
            ? `Offline — ${pending} action${pending === 1 ? '' : 's'} waiting to sync`
            : 'Offline — changes will be saved and synced later'
          : `Syncing ${pending} pending action${pending === 1 ? '' : 's'}...`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 8, alignItems: 'center' },
  offline: { backgroundColor: '#b23a3a' },
  syncing: { backgroundColor: '#c98a1d' },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});