// frontend/src/api/authApi.js
import { api } from './axiosClient.js';  // ✔ CORRECT


export const AuthApi = {
  signup: (payload) => api.post('/auth/signup', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
};
