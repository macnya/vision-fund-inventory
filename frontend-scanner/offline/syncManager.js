import NetInfo from '@react-native-community/netinfo';
import { verifyAsset, assignAsset, checkInAssignment } from '../api';
import { getPendingActions, markActionSynced, markActionFailed, getTotalPendingCount } from '../db/localDb';

let syncing = false;

async function runAction(action) {
  const { type, asset_code, payload } = action;
  if (type === 'verify') {
    return verifyAsset(asset_code, payload);
  }
  if (type === 'assign') {
    return assignAsset(payload);
  }
  if (type === 'checkin') {
    return checkInAssignment(payload.assignmentId, { latitude: payload.latitude, longitude: payload.longitude });
  }
  throw new Error(`Unknown queued action type: ${type}`);
}

// Processes the queue oldest-first. Stops (without failing remaining items)
// the moment a network error suggests we're offline again — those stay
// 'pending' for the next attempt. A server-rejected action (validation
// error, 404, etc.) is marked 'failed' so it doesn't loop forever.
export async function processPendingActions(onProgress) {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const actions = getPendingActions();
    for (const action of actions) {
      try {
        await runAction(action);
        markActionSynced(action.id);
        synced += 1;
        onProgress?.({ synced, failed, total: actions.length });
      } catch (err) {
        if (!err.response) {
          // Still offline — stop here, leave this and the rest as pending
          break;
        }
        markActionFailed(action.id);
        failed += 1;
        onProgress?.({ synced, failed, total: actions.length });
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

// Call once near app startup. Returns an unsubscribe function.
export function startAutoSync(onProgress) {
  let wasOffline = false;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = !!(state.isConnected && state.isInternetReachable !== false);
    if (online && wasOffline) {
      processPendingActions(onProgress);
    }
    wasOffline = !online;
  });

  // Also attempt once at startup in case actions were queued last session
  processPendingActions(onProgress);

  return unsubscribe;
}

export { getTotalPendingCount };