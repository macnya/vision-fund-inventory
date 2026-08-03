import api, { fetchEmployees, fetchLocations, verifyAsset, assignAsset, checkInAssignment } from '../api';
import {
  cacheAsset, getCachedAsset,
  cacheEmployees, getCachedEmployees,
  cacheLocations, getCachedLocations,
  queueAction, getPendingCountForAsset,
} from '../db/localDb';

// Network errors from axios have no `err.response`. A 404/400/etc DOES have
// `err.response`, meaning the server was reached — that's a real error, not
// an offline condition, so we only fall back to offline handling when
// `err.response` is missing.
function isOffline(err) {
  return !err.response;
}

// ---- Reads ----

export async function getAssetByCodeOffline(assetCode) {
  try {
    const res = await api.get(`/assets/${encodeURIComponent(assetCode)}`);
    cacheAsset(assetCode, res.data);
    return { data: res.data, fromCache: false };
  } catch (err) {
    if (!isOffline(err)) throw err;
    const cached = getCachedAsset(assetCode);
    if (!cached) throw err; // never seen this asset before — nothing to show offline
    return { data: cached, fromCache: true, pendingCount: getPendingCountForAsset(assetCode) };
  }
}

export async function fetchEmployeesOffline() {
  try {
    const data = await fetchEmployees();
    cacheEmployees(data);
    return data;
  } catch (err) {
    if (!isOffline(err)) throw err;
    return getCachedEmployees();
  }
}

export async function fetchLocationsOffline() {
  try {
    const data = await fetchLocations();
    cacheLocations(data);
    return data;
  } catch (err) {
    if (!isOffline(err)) throw err;
    return getCachedLocations();
  }
}

// ---- Writes: verify / assign / check-in ----
// Each: try the real request. If it fails because we're offline, queue it
// AND optimistically patch the local asset cache so the UI reflects the
// change immediately, with a "pending sync" flag the UI can show.

export async function verifyAssetOffline(assetCode, payload) {
  try {
    return await verifyAsset(assetCode, payload);
  } catch (err) {
    if (!isOffline(err)) throw err;
    queueAction('verify', assetCode, payload);
    const cached = getCachedAsset(assetCode);
    if (cached) {
      cached.asset.condition = payload.condition;
      cached.pendingSync = true;
      cacheAsset(assetCode, cached);
    }
    return { queued: true, ...payload };
  }
}

export async function assignAssetOffline(assetCode, { asset_id, employee_id, location_id, latitude, longitude }) {
  try {
    return await assignAsset({ asset_id, employee_id, location_id, latitude, longitude });
  } catch (err) {
    if (!isOffline(err)) throw err;
    queueAction('assign', assetCode, { asset_id, employee_id, location_id, latitude, longitude });
    const cached = getCachedAsset(assetCode);
    if (cached) {
      const employees = getCachedEmployees();
      const locations = getCachedLocations();
      const emp = employees.find((e) => e.id === employee_id);
      const loc = locations.find((l) => l.id === location_id);
      cached.current_assignment = {
        employee_name: emp?.name || null,
        branch: loc?.branch || null,
        physical_location: loc?.physical_location || null,
      };
      cached.pendingSync = true;
      cacheAsset(assetCode, cached);
    }
    return { queued: true };
  }
}

export async function checkInOffline(assetCode, assignmentId, { latitude, longitude } = {}) {
  try {
    return await checkInAssignment(assignmentId, { latitude, longitude });
  } catch (err) {
    if (!isOffline(err)) throw err;
    queueAction('checkin', assetCode, { assignmentId, latitude, longitude });
    const cached = getCachedAsset(assetCode);
    if (cached) {
      cached.current_assignment = null;
      cached.pendingSync = true;
      cacheAsset(assetCode, cached);
    }
    return { queued: true };
  }
}