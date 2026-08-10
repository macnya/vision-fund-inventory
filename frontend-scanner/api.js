import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach the JWT token (if we have one) to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Fire-and-forget nudge to wake a sleeping server. Deliberately NOT awaited by
// callers and deliberately swallows its own errors: if the officer is offline
// this must not surface as a failure, because the app works offline by design.
export function wakeServer() {
  api.get('/health', { timeout: 60000 }).catch(() => {});
}

// Convenience functions used across screens
export async function fetchEmployees() {
  const res = await api.get('/employees');
  return res.data;
}

export async function fetchLocations() {
  const res = await api.get('/locations');
  return res.data;
}

export async function assignAsset({ asset_id, employee_id, location_id, latitude, longitude }) {
  const res = await api.post('/assignments', { asset_id, employee_id, location_id, latitude, longitude });
  return res.data;
}

export async function checkInAssignment(assignmentId, { latitude, longitude } = {}) {
  const res = await api.patch(`/assignments/${assignmentId}/return`, { latitude, longitude });
  return res.data;
}

export async function fetchCategories() {
  const res = await api.get('/assets/categories');
  return res.data;
}

export async function createAsset(payload) {
  const res = await api.post('/assets', payload);
  return res.data;
}

export async function verifyAsset(assetCode, { condition, remarks, latitude, longitude }) {
  // Must be encoded: 69 assets have codes like "F&F/002" and "EQP/001".
  // Unencoded, the slash became an extra path segment, no route matched, and
  // the server's catch-all returned "Not found" — so those assets could be
  // scanned and viewed but never verified.
  const res = await api.post(`/assets/${encodeURIComponent(assetCode)}/verify`, { condition, remarks, latitude, longitude });
  return res.data;
}

export async function fetchVerificationReport(filters = {}) {
  const res = await api.get('/verifications', { params: filters });
  return res.data;
}