// frontend/src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const user = token ? JSON.parse(localStorage.getItem('user') || 'null') : null;

const slice = createSlice({
  name: 'auth',
  initialState: { token, user },
  reducers: {
    setAuth(state, action) {
      const { token, user } = action.payload;
      state.token = token; state.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout(state) {
      state.token = null; state.user = null;
      localStorage.removeItem('token'); localStorage.removeItem('user');
    }
  }
});

export const { setAuth, logout } = slice.actions;
export default slice.reducer;
