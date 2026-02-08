import API_ENDPOINTS from './apiConfig';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const ChangeApi = {
  create: async (spaceId, payload) => {
    const response = await fetch(API_ENDPOINTS.CHANGES.BASE(spaceId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
  
  get: async (spaceId, changeId) => {
    const response = await fetch(API_ENDPOINTS.CHANGES.BY_ID(spaceId, changeId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  
  list: async (spaceId, limit = 50, skip = 0) => {
    const url = new URL(API_ENDPOINTS.CHANGES.BASE(spaceId));
    url.searchParams.append('limit', limit);
    url.searchParams.append('skip', skip);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
};
