import { api } from './axiosClient.js';

export const BacklogApi = {
  list: (spaceId) => api.get(`/spaces/${spaceId}/backlog`),
  create: (spaceId, payload) => api.post(`/spaces/${spaceId}/backlog`, payload),
  edit: (id, payload) => api.patch(`/work-items/${id}`, payload),
  remove: (id) => api.delete(`/work-items/${id}`),
  addToSprint: (sprintId, itemIds) => api.post(`/sprints/${sprintId}/add-items`, { itemIds })
};
