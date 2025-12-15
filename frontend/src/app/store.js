// frontend/src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.js';
import spacesReducer from '../features/spaces/spacesSlice.js';

export const store = configureStore({
  reducer: { auth: authReducer, spaces: spacesReducer }
});
