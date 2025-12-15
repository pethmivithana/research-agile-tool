import { createSlice } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'spaces',
  initialState: { list: [], current: null },
  reducers: {
    setSpaces(state, action) { state.list = action.payload; },
    setCurrentSpace(state, action) { state.current = action.payload; }
  }
});

export const { setSpaces, setCurrentSpace } = slice.actions;
export default slice.reducer;
