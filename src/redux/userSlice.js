import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentUser: null,
    isAuthenticated: false,
    onlineUsers: [],
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.currentUser = action.payload;
            state.isAuthenticated = true;
        },
        logoutUser: (state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
            state.onlineUsers = [];
        },
        setOnlineUsers: (state, action) => {
            state.onlineUsers = action.payload;
        }
    }
});

export const { setUser, logoutUser, setOnlineUsers } = userSlice.actions;
export default userSlice.reducer;