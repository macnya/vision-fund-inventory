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