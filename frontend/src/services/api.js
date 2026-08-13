import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
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
          const res = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
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
  passerEtape: (id, action, observations = '') => API.post(`demandes/${id}/passer_etape/`, { action, observations }),
  getPublicVerification: (query) => API.get('demandes/public_verification/', { params: { query } }),
  getStatsOverview: () => API.get('demandes/stats_overview/'),
};

export const notificationsAPI = {
  getNotifications: () => API.get('notifications/'),
};

export default API;
