import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tokens last 8 hours. Without this, expiry showed up as unexplained blank
// tables and failed saves scattered across the app, with no way back to the
// login screen short of a manual refresh.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Reloading drops us back to <Login /> because App reads user from storage.
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export default api;

// Trades the current (still valid) token for a fresh 8h one. Called on app
// load so a working session doesn't expire mid-afternoon. The endpoint already
// existed on the backend but nothing had ever called it.
export async function refreshSession() {
  const res = await api.post('/auth/refresh');
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data.user;
}

// GET /assets is paginated and returns { data, total, limit, offset } rather
// than a bare array. Passing limit/offset through lets the list page properly
// instead of silently showing the first 200 rows.
export async function fetchAssets({ search, status, limit, offset } = {}) {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  if (limit != null) params.limit = limit;
  if (offset != null) params.offset = offset;
  const res = await api.get('/assets', { params });
  return res.data;
}

export async function fetchAssetDetail(assetCode) {
  const res = await api.get(`/assets/${encodeURIComponent(assetCode)}`);
  return res.data;
}

export async function fetchAssetHistory(assetId) {
  const res = await api.get(`/assignments/history/${assetId}`);
  return res.data;
}

export async function markAssetDisposed({ asset_id, sales_proceeds, disposal_month, notes }) {
  const res = await api.post('/disposals', { asset_id, sales_proceeds, disposal_month, notes });
  return res.data;
}

export async function markAssetLost({ asset_id, notes }) {
  const res = await api.post('/lost-assets', { asset_id, notes });
  return res.data;
}

export async function fetchDashboardStats() {
  const res = await api.get('/dashboard/stats');
  return res.data;
}

// verifiedOnly restricts the map to GPS captured during a physical
// verification, ignoring assignment and check-in scans.
export async function fetchAssetLocations({ verifiedOnly = false } = {}) {
  const res = await api.get('/dashboard/asset-locations', {
    params: verifiedOnly ? { verifiedOnly: 'true' } : {},
  });
  return res.data;
}

// PATCH /verifications/:id — admin correction of a mistyped condition/remark.
// The server records who changed it and when.
export async function updateVerification(id, { condition, remarks }) {
  const res = await api.patch(`/verifications/${id}`, { condition, remarks });
  return res.data;
}

// Downloads the PDF summary report and triggers a save-as in the browser.
export async function downloadSummaryReportPdf() {
  const res = await api.get('/dashboard/report/pdf', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vision-fund-asset-summary.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchUsers() {
  const res = await api.get('/auth/users');
  return res.data;
}

export async function updateUserRole(id, role) {
  const res = await api.put(`/auth/users/${id}/role`, { role });
  return res.data;
}

export async function deleteUser(id) {
  const res = await api.delete(`/auth/users/${id}`);
  return res.data;
}

export async function createUser({ name, email, password, role }) {
  const res = await api.post('/auth/register', { name, email, password, role });
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

export async function fetchLocationsList() {
  const res = await api.get('/locations');
  return res.data;
}

export async function fetchEmployeesList() {
  const res = await api.get('/employees');
  return res.data;
}

export async function createAssignment({ asset_id, employee_id, location_id, latitude, longitude }) {
  const res = await api.post('/assignments', { asset_id, employee_id, location_id, latitude, longitude });
  return res.data;
}