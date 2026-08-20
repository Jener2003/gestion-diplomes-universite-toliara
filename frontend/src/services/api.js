import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const API = axios.create({
  baseURL: BASE_URL,
});

// Attach JWT token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Refresh token interceptor on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return API(originalRequest);
        } catch (refreshError) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => API.post('token/', { username, password }),
  getMe: () => API.get('utilisateurs/me/'),
};

export const demandesAPI = {
  getDemandes: (params = {}) => API.get('demandes/', { params }),
  getDemandeById: (id) => API.get(`demandes/${id}/`),
  creerDemande: (formData) => API.post('demandes/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  passerEtape: (id, action, observations = '', mention = '') => API.post(`demandes/${id}/passer_etape/`, { action, observations, mention }),
  getPublicVerification: (query) => API.get('demandes/public_verification/', { params: { query } }),
  getStatsOverview: () => API.get('demandes/stats_overview/'),
  getKpiPresidence: () => API.get('demandes/kpi_presidence/'),
};

export const etudiantsAPI = {
  getMine: () => API.get('etudiants/'),
  updateMine: (id, formData) => API.patch(`etudiants/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const diplomesAPI = {
  getMine: () => API.get('diplomes/'),
};

export const notificationsAPI = {
  getNotifications: () => API.get('notifications/'),
  marquerLu: (id) => API.post(`notifications/${id}/marquer_lu/`),
};

export default API;
