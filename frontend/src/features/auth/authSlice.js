// frontend/src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

// Initialize from localStorage
const getInitialState = () => {
  try {
    const token = localStorage.getItem('token');
    const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    return { token, user };
  } catch (error) {
    console.error('Failed to parse auth state from localStorage:', error);
    return { token: null, user: null };
  }
};

const slice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setAuth(state, action) {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    hydrate(state, action) {
      // For manual hydration if needed
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
    }
  }
});

export const { setAuth, logout, hydrate } = slice.actions;
export default slice.reducer;
