/**
 * Work Items API Service
 * Handles all work item-related API calls
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
 * Get all work items for a space
 */
export const getWorkItems = async (spaceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BASE(spaceId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to fetch work items:', error);
    throw error;
  }
};

/**
 * Get work item by ID
 */
export const getWorkItem = async (spaceId, workItemId) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BY_ID(spaceId, workItemId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to fetch work item ${workItemId}:`, error);
    throw error;
  }
};

/**
 * Get backlog items (items not in any sprint)
 */
export const getBacklog = async (spaceId) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BACKLOG(spaceId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to fetch backlog:', error);
    throw error;
  }
};

/**
 * Create new work item
 */
export const createWorkItem = async (spaceId, workItemData) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BASE(spaceId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(workItemData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Failed to create work item:', error);
    throw error;
  }
};

/**
 * Update work item
 */
export const updateWorkItem = async (spaceId, workItemId, updateData) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BY_ID(spaceId, workItemId), {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to update work item ${workItemId}:`, error);
    throw error;
  }
};

/**
 * Delete work item
 */
export const deleteWorkItem = async (spaceId, workItemId) => {
  try {
    const response = await fetch(API_ENDPOINTS.WORK_ITEMS.BY_ID(spaceId, workItemId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`Failed to delete work item ${workItemId}:`, error);
    throw error;
  }
};

/**
 * Move work item to sprint
 */
export const moveToSprint = async (spaceId, workItemId, sprintId) => {
  try {
    return await updateWorkItem(spaceId, workItemId, { sprint: sprintId });
  } catch (error) {
    console.error(`Failed to move work item ${workItemId} to sprint ${sprintId}:`, error);
    throw error;
  }
};

/**
 * Move work item to backlog (remove from sprint)
 */
export const moveToBacklog = async (spaceId, workItemId) => {
  try {
    return await updateWorkItem(spaceId, workItemId, { sprint: null });
  } catch (error) {
    console.error(`Failed to move work item ${workItemId} to backlog:`, error);
    throw error;
  }
};

/**
 * Update work item status
 */
export const updateStatus = async (spaceId, workItemId, status) => {
  try {
    return await updateWorkItem(spaceId, workItemId, { status });
  } catch (error) {
    console.error(`Failed to update status for work item ${workItemId}:`, error);
    throw error;
  }
};

/**
 * Update work item priority
 */
export const updatePriority = async (spaceId, workItemId, priority) => {
  try {
    return await updateWorkItem(spaceId, workItemId, { priority });
  } catch (error) {
    console.error(`Failed to update priority for work item ${workItemId}:`, error);
    throw error;
  }
};

export default {
  getWorkItems,
  getWorkItem,
  getBacklog,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
  moveToSprint,
  moveToBacklog,
  updateStatus,
  updatePriority,
};