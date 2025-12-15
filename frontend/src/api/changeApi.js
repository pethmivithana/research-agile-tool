import { api } from './axiosClient.js';

export const ChangeApi = {
  create: (payload) => api.post('/changes', payload),
  get: (id) => api.get(`/changes/${id}`)
};
