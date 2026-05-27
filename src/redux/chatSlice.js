import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    messages: [],
    isLoading: false,
    error: null,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        clearMessages: (state) => {
            state.messages = [];
        }
    }
});

export const { setMessages, addMessage, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;