import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentRoom: null,
};

const roomSlice = createSlice({
    name: 'room',
    initialState,
    reducers: {
        setRoom: (state, action) => {
            state.currentRoom = action.payload;
        },
        clearRoom: (state) => {
            state.currentRoom = null;
        },
        addMember: (state, action) => {
            if (state.currentRoom) {
                const exists = state.currentRoom.members.find(m => String(m._id) === String(action.payload._id));
                if (!exists && String(state.currentRoom.host._id) !== String(action.payload._id)) {
                    state.currentRoom.members.push(action.payload);
                }
            }
        },
        removeMember: (state, action) => {
            if (state.currentRoom) {
                state.currentRoom.members = state.currentRoom.members.filter(m => String(m._id) !== String(action.payload));
            }
        }
    }
});

export const { setRoom, clearRoom, addMember, removeMember } = roomSlice.actions;
export default roomSlice.reducer;