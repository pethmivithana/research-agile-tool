import { api } from './axiosClient.js';

export const MlApi = {
  predictImpact: (change) => api.post('/ml/predict-impact', { change }),
  getRecommendations: (impacts) => api.post('/ml/get-recommendations', { impacts })
};
