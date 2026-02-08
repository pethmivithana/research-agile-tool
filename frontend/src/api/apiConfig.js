/**
 * API Configuration for FastAPI Backend
 * This file centralizes all API endpoint configurations
 */

// Base API URL (Vite uses import.meta.env instead of process.env)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    ME: `${API_BASE_URL}/api/auth/me`,
    HEALTH: `${API_BASE_URL}/api/auth/health`,
  },

  // Spaces
  SPACES: {
    BASE: `${API_BASE_URL}/api/spaces`,
    BY_ID: (id) => `${API_BASE_URL}/api/spaces/${id}`,
  },

  // Sprints
  SPRINTS: {
    BASE: (spaceId) => `${API_BASE_URL}/api/sprints/${spaceId}`,
    BY_ID: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}`,
    START: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}/start`,
    COMPLETE: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}/complete`,
    DELETE: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}`,
    BOARD: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}/board`,
    BOARD_MOVE: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}/board/move`,
    WORK_ITEMS: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}/work-items`,
  },

  // Work Items
  WORK_ITEMS: {
    BASE: (spaceId) =>
      `${API_BASE_URL}/api/backlog/${spaceId}`,
    BY_ID: (spaceId, workItemId) =>
      `${API_BASE_URL}/api/work-items/${workItemId}`,
    BACKLOG: (spaceId) =>
      `${API_BASE_URL}/api/backlog/${spaceId}`,
    IN_SPRINT: (spaceId, sprintId) =>
      `${API_BASE_URL}/api/sprints/${sprintId}/work-items`,
    DELETE: (workItemId) =>
      `${API_BASE_URL}/api/work-items/${workItemId}`,
    PATCH: (workItemId) =>
      `${API_BASE_URL}/api/work-items/${workItemId}`,
  },

  // Impact Analysis
  IMPACT: {
    HEALTH: `${API_BASE_URL}/api/impact/health`,
    ANALYZE_BACKLOG: (workItemId) =>
      `${API_BASE_URL}/api/impact/backlog/${workItemId}/analyze`,
    ANALYZE_MID_SPRINT: (sprintId) =>
      `${API_BASE_URL}/api/impact/sprints/${sprintId}/analyze-impact`,
    APPLY_RECOMMENDATION: (sprintId) =>
      `${API_BASE_URL}/api/impact/sprints/${sprintId}/apply-recommendation`,
  },

  // Change Events
  CHANGES: {
    BASE: (spaceId) =>
      `${API_BASE_URL}/api/${spaceId}/changes`,
    BY_ID: (spaceId, changeId) =>
      `${API_BASE_URL}/api/changes/${changeId}`,
  },
};

export default API_ENDPOINTS;
