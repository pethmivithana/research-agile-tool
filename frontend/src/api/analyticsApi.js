import { api } from './axiosClient.js';

export const AnalyticsApi = {
  velocity: (spaceId) => api.get(`/spaces/${spaceId}/analytics/velocity`),
  changes: (spaceId) => api.get(`/spaces/${spaceId}/analytics/changes`)
};
