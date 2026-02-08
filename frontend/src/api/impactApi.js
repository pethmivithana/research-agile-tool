/**
 * Impact Analysis API Service
 * Handles ML-powered impact analysis API calls
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
 * Check impact analysis service health
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.IMPACT.HEALTH, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('Impact service health check failed:', error);
    throw error;
  }
};

/**
 * Analyze backlog item (pre-sprint planning)
 */
export const analyzeBacklogItem = async (workItemId) => {
  try {
    console.log(`🔍 Analyzing backlog item: ${workItemId}`);
    
    const response = await fetch(API_ENDPOINTS.IMPACT.ANALYZE_BACKLOG(workItemId), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    const data = await handleResponse(response);
    console.log('✅ Backlog analysis complete:', data);
    
    return data;
  } catch (error) {
    console.error('Failed to analyze backlog item:', error);
    throw error;
  }
};

/**
 * Analyze mid-sprint impact of adding new work item
 */
export const analyzeMidSprintImpact = async (sprintId, itemData) => {
  try {
    console.log(`⚡ Analyzing mid-sprint impact for sprint: ${sprintId}`);
    
    const response = await fetch(API_ENDPOINTS.IMPACT.ANALYZE_MID_SPRINT(sprintId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    
    const data = await handleResponse(response);
    console.log('✅ Mid-sprint analysis complete:', data);
    
    return data;
  } catch (error) {
    console.error('Failed to analyze mid-sprint impact:', error);
    throw error;
  }
};

/**
 * Apply a recommendation from impact analysis
 */
export const applyRecommendation = async (sprintId, recommendation) => {
  try {
    console.log(`✨ Applying recommendation for sprint: ${sprintId}`, recommendation);
    
    const response = await fetch(API_ENDPOINTS.IMPACT.APPLY_RECOMMENDATION(sprintId), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(recommendation),
    });
    
    const data = await handleResponse(response);
    console.log('✅ Recommendation applied:', data);
    
    return data;
  } catch (error) {
    console.error('Failed to apply recommendation:', error);
    throw error;
  }
};

export default {
  checkHealth,
  analyzeBacklogItem,
  analyzeMidSprintImpact,
  applyRecommendation,
};
