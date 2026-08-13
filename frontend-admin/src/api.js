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
export async function fetchAssets({ search, status, category, branch, assigned, sort, limit, offset } = {}) {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  if (category) params.category = category;
  if (branch) params.branch = branch;
  if (assigned) params.assigned = assigned;      // 'yes' | 'no'
  if (sort) params.sort = sort;
  if (limit != null) params.limit = limit;
  if (offset != null) params.offset = offset;
  const res = await api.get('/assets', { params });
  return res.data;
}

// Categories, branches, statuses and conditions in one request, so the filter
// bar doesn't fire four.
export async function fetchAssetFilters() {
  const res = await api.get('/assets/filters');
  return res.data;
}

// PATCH /assets/:code — admin correction of asset details. asset_code and
// status are not editable; see the note on the endpoint.
export async function updateAsset(assetCode, changes) {
  const res = await api.patch(`/assets/${encodeURIComponent(assetCode)}`, changes);
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

// branch only means anything for a Branch Administrator; the backend clears
// it for every other role so a stale value can't quietly take effect later.
export async function updateUserRole(id, role, branch) {
  const res = await api.put(`/auth/users/${id}/role`, { role, branch });
  return res.data;
}

export async function deleteUser(id) {
  const res = await api.delete(`/auth/users/${id}`);
  return res.data;
}

// The account holder changes their own password. Requires the current one, so
// a stolen token can't be used to lock the owner out.
export async function changePassword({ current_password, new_password }) {
  const res = await api.post('/auth/change-password', { current_password, new_password });
  return res.data;
}

// Admin sets a temporary password. The backend forces a change on next sign-in.
export async function resetUserPassword(id, newPassword) {
  const res = await api.post(`/auth/users/${id}/reset-password`, { new_password: newPassword });
  return res.data;
}

export async function createUser({ name, email, password, role, branch }) {
  const res = await api.post('/auth/register', { name, email, password, role, branch });
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

// The branch structure with live asset counts, for the Branches page.
export async function fetchBranchTree() {
  const res = await api.get('/locations/branches');
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

// --- Approvals ------------------------------------------------------------
// Drives the badge in the navigation. Returns only what the caller may
// actually review — their own submissions are excluded server-side.
export async function fetchPendingCount() {
  const res = await api.get('/verifications/pending/count');
  return res.data;
}

export async function fetchPendingVerifications() {
  const res = await api.get('/verifications', { params: { status: 'pending' } });
  return res.data;
}

export async function fetchPendingAssets() {
  const res = await api.get('/assets/pending');
  return res.data;
}

export async function approveVerification(id) {
  const res = await api.post(`/verifications/${id}/approve`);
  return res.data;
}

export async function rejectVerification(id, reason) {
  const res = await api.post(`/verifications/${id}/reject`, { reason });
  return res.data;
}

export async function approveAsset(assetCode) {
  const res = await api.post(`/assets/${encodeURIComponent(assetCode)}/approve`);
  return res.data;
}

export async function rejectAsset(assetCode, reason) {
  const res = await api.post(`/assets/${encodeURIComponent(assetCode)}/reject`, { reason });
  return res.data;
}