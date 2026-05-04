import axios from 'axios';
import { getStoredAccessToken, getValidAccessToken } from './authSession';

const BASE_URL = '/api/auth';

export const authApi = {
  register: async (data) => {
    const response = await axios.post(`${BASE_URL}/register`, data);
    return response.data;
  },
  login: async (data) => {
    const response = await axios.post(`${BASE_URL}/login`, data);
    return response.data;
  },
  logout: async () => {
    const token = await getValidAccessToken().catch(() => getStoredAccessToken());
    const response = await axios.post(
      `${BASE_URL}/logout`,
      {},
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );
    return response.data;
  },
  refreshToken: async (token) => {
    const response = await axios.post(`${BASE_URL}/refresh`, { token });
    return response.data;
  },
  getMe: async (token) => {
    const effectiveToken = token || await getValidAccessToken();
    const response = await axios.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${effectiveToken}` }
    });
    return response.data;
  },
  googleAuth: async (credential) => {
    const response = await axios.post(`${BASE_URL}/google`, { credential });
    return response.data;
  },
  setPassword: async (password, token) => {
    const effectiveToken = token || await getValidAccessToken();
    const response = await axios.post(`${BASE_URL}/set-password`, { password }, {
      headers: { Authorization: `Bearer ${effectiveToken}` }
    });
    return response.data;
  }
};
