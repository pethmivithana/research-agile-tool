/**
 * Sprints API Service
 * Handles all sprint-related API calls
 */

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

/**
 * Get all sprints for a space
 */
export const getSprints = async (spaceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.BASE(spaceId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to fetch sprints:', error);
    throw error;
  }
};

/**
 * Get sprint by ID
 */
export const getSprint = async (spaceId, sprintId) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.BY_ID(spaceId, sprintId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to fetch sprint ${sprintId}:`, error);
    throw error;
  }
};

/**
 * Create new sprint
 */
export const createSprint = async (spaceId, sprintData) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.BASE(spaceId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sprintData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to create sprint:', error);
    throw error;
  }
};

/**
 * Update sprint
 */
export const updateSprint = async (spaceId, sprintId, updateData) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.BY_ID(spaceId, sprintId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to update sprint ${sprintId}:`, error);
    throw error;
  }
};

/**
 * Delete sprint
 */
export const deleteSprint = async (spaceId, sprintId) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.BY_ID(spaceId, sprintId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to delete sprint ${sprintId}:`, error);
    throw error;
  }
};

/**
 * Start a sprint
 */
export const startSprint = async (spaceId, sprintId, startData) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.START(spaceId, sprintId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(startData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to start sprint ${sprintId}:`, error);
    throw error;
  }
};

/**
 * Complete a sprint
 */
export const completeSprint = async (spaceId, sprintId) => {
  try {
    const response = await fetch(API_ENDPOINTS.SPRINTS.COMPLETE(spaceId, sprintId), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to complete sprint ${sprintId}:`, error);
    throw error;
  }
};

/**
 * Get work items in sprint
 */
export const getSprintWorkItems = async (spaceId, sprintId) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.IN_SPRINT(spaceId, sprintId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to fetch work items for sprint ${sprintId}:`, error);
    throw error;
  }
};

export default {
  getSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  startSprint,
  completeSprint,
  getSprintWorkItems,
};