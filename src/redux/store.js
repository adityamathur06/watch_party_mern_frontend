import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import roomReducer from './roomSlice';
import chatReducer from './chatSlice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        room: roomReducer,
        chat: chatReducer
    },
});