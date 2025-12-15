import { api } from './axiosClient.js';

export const SprintsApi = {
  list: (spaceId) => api.get(`/spaces/${spaceId}/sprints`),
  create: (spaceId, payload) => api.post(`/spaces/${spaceId}/sprints`, payload),
  start: (id) => api.post(`/sprints/${id}/start`),
  complete: (id) => api.post(`/sprints/${id}/complete`)
};
