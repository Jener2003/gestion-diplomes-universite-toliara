import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

// Sécurité : les jetons sont conservés en sessionStorage (effacés à la fermeture du navigateur).
// On purge ceux qu'une ancienne version aurait laissés dans le stockage permanent.
try {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
} catch { /* stockage indisponible */ }

const API = axios.create({
  baseURL: BASE_URL,
});

// Rafraîchissements périodiques : non comptés comme activité de l'agent (statut de présence)
const AUTO = { 'X-Requete-Auto': '1' };

// Attach JWT token to requests if available
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
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
      const refreshToken = sessionStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}token/refresh/`, {
            refresh: refreshToken,
          });
          sessionStorage.setItem('access_token', res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return API(originalRequest);
        } catch (refreshError) {
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // 2FA Step 1: send OTP to email
  loginStep1: (username, password) =>
    API.post('auth/login/', { username, password }),
  // 2FA Step 2: verify OTP and get JWT tokens
  verifyOtp: (username, code) =>
    API.post('auth/verify-otp/', { username, code }),
  // Lien personnel reçu par e-mail : vérification (sans mot de passe) puis définition
  definirMotDePasse: (payload) => API.post('auth/definir-mot-de-passe/', payload),
  getMe: () => API.get('utilisateurs/me/'),
  // Déconnexion côté serveur (statut « hors ligne » immédiat), par le jeton de renouvellement
  logout: (refresh) => API.post('auth/logout/', { refresh }),
  // Inscription : espaces ouverts, demande (code envoyé à l'adresse de l'espace), confirmation
  espacesInscription: () => API.get('auth/inscription/espaces/'),
  inscrire: (donnees) => API.post('auth/inscription/', donnees),
  confirmerInscription: (username, code) => API.post('auth/inscription/confirmer/', { username, code }),
  getImprimeurs: () => API.get('utilisateurs/imprimeurs/'),
  getAgentsTransmission: () => API.get('utilisateurs/agents_transmission/'),
};

export const demandesAPI = {
  getDemandes: (params = {}) => API.get('demandes/', { params }),
  getArchives: (params = {}, auto = false) => API.get('demandes/archives/', { params, headers: auto ? AUTO : {} }),
  getDemandeById: (id) => API.get(`demandes/${id}/`),
  creerDemande: (formData) => API.post('demandes/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  passerEtape: (id, payload) => API.post(`demandes/${id}/passer_etape/`, payload),
  getPublicVerification: (query) => API.get('demandes/public_verification/', { params: { query } }),
  getStatsOverview: () => API.get('demandes/stats_overview/'),
  getKpiPresidence: () => API.get('demandes/kpi_presidence/'),
  getHistoriques: () => API.get('historiques/'),
};

export const etudiantsAPI = {
  getMine: () => API.get('etudiants/'),
  updateMine: (id, formData) => API.patch(`etudiants/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const diplomesAPI = {
  getMine: () => API.get('diplomes/'),
};

export const notificationsAPI = {
  getNotifications: () => API.get('notifications/', { headers: AUTO }),
  marquerLu: (id) => API.post(`notifications/${id}/marquer_lu/`),
  marquerTousLus: () => API.post('notifications/marquer_tous_lus/'),
};

// Espace Administrateur système (toutes ces routes sont refusées côté serveur aux autres rôles)
export const adminAPI = {
  getStats: (auto = false) => API.get('administration/stats/', { headers: auto ? AUTO : {} }),
  getUtilisateurs: (params = {}, auto = false) => API.get('administration/utilisateurs/', { params, headers: auto ? AUTO : {} }),
  creerUtilisateur: (data) => API.post('administration/utilisateurs/', data),
  modifierUtilisateur: (id, data) => API.patch(`administration/utilisateurs/${id}/`, data),
  activerUtilisateur: (id) => API.post(`administration/utilisateurs/${id}/activer/`),
  desactiverUtilisateur: (id) => API.post(`administration/utilisateurs/${id}/desactiver/`),
  reinitialiserAcces: (id) => API.post(`administration/utilisateurs/${id}/reinitialiser_acces/`),
  refuserInscription: (id) => API.post(`administration/utilisateurs/${id}/refuser_inscription/`),
  getRoles: () => API.get('administration/roles/'),
  getEquipes: () => API.get('administration/equipes/'),
  definirEquipe: (role, data) => API.put(`administration/equipes/${role}/`, data),
  testerEquipe: (role) => API.post(`administration/equipes/${role}/tester/`),
  getJournal: (params = {}) => API.get('administration/journal/', { params }),
  getSecurite: () => API.get('administration/securite/'),
};

export const chatbotAPI = {
  ask: (message) => API.post('chatbot/ask/', { message }),
  getSuggestions: () => API.get('chatbot/suggestions/'),
};

export default API;
