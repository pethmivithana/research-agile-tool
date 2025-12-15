import { api } from './axiosClient.js';

export const SpacesApi = {
  list: () => api.get('/spaces'),
  create: (payload) => api.post('/spaces', payload),
  get: (id) => api.get(`/spaces/${id}`),
  addCollaborators: (id, collaborators) => api.post(`/spaces/${id}/collaborators`, { collaborators })
};
