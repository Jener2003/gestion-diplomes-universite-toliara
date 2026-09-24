import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.clear();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  /**
   * Étape 1 : vérifie username+password, déclenche l'envoi de l'OTP par email.
   * Retourne { otpRequired: true, username, emailHint, message } en cas de succès.
   */
  const loginStep1 = async (username, password) => {
    setLoading(true);
    try {
      const response = await authAPI.loginStep1(username, password);
      setLoading(false);
      return {
        otpRequired: true,
        username: response.data.username,
        emailHint: response.data.email_hint,
        message: response.data.message,
        devOtpCode: response.data.dev_otp_code,
      };
    } catch (error) {
      setLoading(false);
      let errorMsg = 'Identifiants incorrects.';
      if (!error.response) {
        errorMsg = 'Serveur backend inaccessible (vérifiez que Django fonctionne sur le port 8000).';
      } else if (error.response.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      return {
        otpRequired: false,
        error: errorMsg,
      };
    }
  };

  /**
   * Étape 2 : vérifie le code OTP, stocke les tokens JWT et charge le profil.
   * Retourne { success: true, user } en cas de succès.
   */
  const loginStep2 = async (username, code) => {
    setLoading(true);
    try {
      const response = await authAPI.verifyOtp(username, code);
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      const loggedInUser = await fetchCurrentUser();
      return { success: true, user: loggedInUser };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        error: error.response?.data?.detail || 'Code de vérification incorrect.',
      };
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginStep1, loginStep2, logout, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
