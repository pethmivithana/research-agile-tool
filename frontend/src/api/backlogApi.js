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

export const BacklogApi = {
  list: async (spaceId) => {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BACKLOG(spaceId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  
  create: async (spaceId, payload) => {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BACKLOG(spaceId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
  
  edit: async (id, payload) => {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.PATCH(id), {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },
  
  remove: async (id) => {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.DELETE(id), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  
  get: async (spaceId, id) => {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BY_ID(spaceId, id), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
  
  addToSprint: async (sprintId, itemIds) => {
    const response = await fetch(`${API_ENDPOINTS.SPRINTS.WORK_ITEMS('', sprintId).replace('/work-items', '')}/add-items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ itemIds }),
    });
    return handleResponse(response);
  }
};
