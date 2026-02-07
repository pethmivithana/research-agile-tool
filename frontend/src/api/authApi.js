/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import API_ENDPOINTS from './apiConfig';

/**
 * Get authentication headers with JWT token
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
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @returns {Promise<Object>} - { access_token, token_type, user }
 */
export const register = async (userData) => {
  try {
    console.log('📝 Registering user:', userData.email);
    
    const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await handleResponse(response);
    
    // Store token and user data
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('✅ Registration successful');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    throw error;
  }
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} - { access_token, token_type, user }
 */
export const login = async (credentials) => {
  try {
    console.log('🔐 Logging in user:', credentials.email);
    
    const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await handleResponse(response);
    
    // Store token and user data
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('✅ Login successful');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('👋 User logged out');
};

/**
 * Get current user info
 * @returns {Promise<Object>} - User object
 */
export const getCurrentUser = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH.ME, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  } catch (error) {
    console.error('❌ Failed to get current user:', error.message);
    
    // If unauthorized, clear local storage
    if (error.message.includes('401')) {
      logout();
    }
    
    throw error;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Get stored user data
 * @returns {Object|null}
 */
export const getStoredUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    return null;
  }
};

/**
 * Get stored token
 * @returns {string|null}
 */
export const getStoredToken = () => {
  return localStorage.getItem('token');
};

/**
 * Check auth service health
 * @returns {Promise<Object>}
 */
export const checkAuthHealth = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH.HEALTH);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Auth health check failed:', error.message);
    throw error;
  }
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getStoredUser,
  getStoredToken,
  checkAuthHealth,
};