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

// Convenience functions used across screens
export async function fetchEmployees() {
  const res = await api.get('/employees');
  return res.data;
}

export async function fetchLocations() {
  const res = await api.get('/locations');
  return res.data;
}

export async function assignAsset({ asset_id, employee_id, location_id }) {
  const res = await api.post('/assignments', { asset_id, employee_id, location_id });
  return res.data;
}

export async function checkInAssignment(assignmentId) {
  const res = await api.patch(`/assignments/${assignmentId}/return`);
  return res.data;
}