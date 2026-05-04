/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/authApi';
import {
  AUTH_EXPIRED_EVENT,
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getValidAccessToken,
  storeAuthSession,
} from '../services/authSession';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    // Attempt to restore session
    const initAuth = async () => {
      const hasStoredSession = getStoredAccessToken() || getStoredRefreshToken();
      if (hasStoredSession) {
        try {
          const validToken = await getValidAccessToken();
          const me = await authApi.getMe(validToken);
          setAccessToken(validToken);
          setUser(me);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Session restoration failed:', error);
          clearAuthSession({ notify: false });
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setAccessToken(null);
      setUser(null);
      setNeedsPassword(false);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    const token = data.accessToken || data.token; // Adapt to backend spec
    storeAuthSession(data);
    setAccessToken(token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    const token = data.accessToken || data.token;
    storeAuthSession(data);
    setAccessToken(token);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const googleLogin = async (credential) => {
    const data = await authApi.googleAuth(credential);
    const token = data.accessToken || data.token;
    storeAuthSession(data);
    setAccessToken(token);
    setUser(data.user);
    setIsAuthenticated(true);
    setNeedsPassword(!!data.needsPassword);
    return data;
  };

  const setPasswordFn = async (password) => {
    await authApi.setPassword(password, accessToken);
    setNeedsPassword(false);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setAccessToken(null);
      setUser(null);
      setNeedsPassword(false);
      setIsAuthenticated(false);
      clearAuthSession({ notify: false });
    }
  };

  const updateAvatarUrl = (avatarUrl) => {
    setUser((prev) => prev ? { ...prev, avatarUrl } : prev);
  };

  const value = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    needsPassword,
    login,
    register,
    googleLogin,
    setPassword: setPasswordFn,
    logout,
    updateAvatarUrl,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}
