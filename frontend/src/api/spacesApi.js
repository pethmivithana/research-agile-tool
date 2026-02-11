/**
 * Spaces API Service
 * Handles all space-related API calls
 */

import API_ENDPOINTS from './apiConfig';

/**
 * Get authentication headers
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Get all spaces for current user
 * @returns {Promise<Array>} - Array of spaces
 */
export const getSpaces = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.SPACES.BASE, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to fetch spaces:', error);
    throw error;
  }
};

/**
 * Get space by ID
 * @param {string} spaceId - Space ID
 * @returns {Promise<Object>} - Space object
 */
export const getSpace = async (spaceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPACES.BY_ID(spaceId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to fetch space ${spaceId}:`, error);
    throw error;
  }
};

/**
 * Create new space
 * @param {Object} spaceData - Space data
 * @param {string} spaceData.name - Space name
 * @param {Array} spaceData.collaborators - Array of collaborator IDs
 * @param {Object} spaceData.settings - Space settings
 * @returns {Promise<Object>} - Created space
 */
export const createSpace = async (spaceData) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPACES.BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(spaceData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to create space:', error);
    throw error;
  }
};

/**
 * Update space
 * @param {string} spaceId - Space ID
 * @param {Object} updateData - Updated space data
 * @returns {Promise<Object>} - Updated space
 */
export const updateSpace = async (spaceId, updateData) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPACES.BY_ID(spaceId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to update space ${spaceId}:`, error);
    throw error;
  }
};

/**
 * Delete space
 * @param {string} spaceId - Space ID
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteSpace = async (spaceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPACES.BY_ID(spaceId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to delete space ${spaceId}:`, error);
    throw error;
  }
};

/**
 * Create space with default export format
 * Returns data in { data } format for React Query compatibility
 */
const listSpaces = async () => {
  const result = await getSpaces();
  return { data: result };
};

const getSpaceById = async (spaceId) => {
  const result = await getSpace(spaceId);
  return { data: result };
};

const createNewSpace = async (spaceData) => {
  const result = await createSpace(spaceData);
  return { data: result };
};

const updateSpaceData = async (spaceId, updateData) => {
  const result = await updateSpace(spaceId, updateData);
  return { data: result };
};

const deleteSpaceData = async (spaceId) => {
  const result = await deleteSpace(spaceId);
  return { data: result };
};

export default {
  list: listSpaces,
  getSpaces,
  get: getSpaceById,
  getSpace,
  create: createNewSpace,
  createSpace,
  update: updateSpaceData,
  updateSpace,
  delete: deleteSpaceData,
  deleteSpace,
};
