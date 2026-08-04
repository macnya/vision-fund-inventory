import axios from 'axios';

const api = axios.create({
  baseURL: 'https://vision-fund-inventory.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

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

export async function fetchAssetLocations() {
  const res = await api.get('/dashboard/asset-locations');
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