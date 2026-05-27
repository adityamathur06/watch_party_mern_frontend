import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setRoom, clearRoom, addMember, removeMember } from '../redux/roomSlice';
import { setMessages, addMessage, clearMessages } from '../redux/chatSlice';
import { setOnlineUsers } from '../redux/userSlice'; // ADDED setOnlineUsers
import axios from 'axios';
import { baseUrl } from '../utils/api';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { getAvatarGradient } from './Dashboard';

export default function Room() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
    const [friendSearchQuery, setFriendSearchQuery] = useState("");
    const [selectedFriends, setSelectedFriends] = useState([]);

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { id } = useParams();

    const chatEndRef = useRef(null);
    const socketRef = useRef(null);
    const videoRef = useRef(null);

    const currentUser = useSelector((state) => state.user.currentUser);
    const onlineUsers = useSelector((state) => state.user.onlineUsers); // PULLING ONLINE ARRAY
    const currentRoom = useSelector((state) => state.room.currentRoom);
    const messages = useSelector((state) => state.chat.messages);

    const isHost = currentRoom && currentUser ? String(currentRoom.host._id) === String(currentUser._id) : false;

    const friendsList = currentUser?.friends || [];
    const filteredFriends = friendsList.filter(friend =>
        friend.name.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
        friend.email.toLowerCase().includes(friendSearchQuery.toLowerCase())
    );

    const usersInRoom = currentRoom ? [
        String(currentRoom.host._id),
        ...currentRoom.members.map(m => String(m._id))
    ] : [];

    const formatTime = (timeInSeconds) => {
        if (!timeInSeconds || isNaN(timeInSeconds)) return "00:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    useEffect(() => {
        const fetchRoomAndChats = async () => {
            try {
                const token = localStorage.getItem('token');
                let roomData = currentRoom;

                if (!roomData || roomData._id !== id) {
                    const roomRes = await axios.get(`${baseUrl}/api/rooms/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (roomRes.data.success) {
                        roomData = roomRes.data.room;
                        dispatch(setRoom(roomData));
                    }
                }

                if (roomData) {
                    const chatRes = await axios.get(`${baseUrl}/api/chats/${roomData.roomId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (chatRes.data.success) {
                        dispatch(setMessages(chatRes.data.chats));
                    }

                    socketRef.current = io(baseUrl);

                    // --- NEW GLOBAL PRESENCE HOOKS ---
                    socketRef.current.emit('register_user', currentUser._id);
                    socketRef.current.on('online_users', (users) => {
                        dispatch(setOnlineUsers(users));
                    });

                    socketRef.current.emit('join_room', roomData.roomId);
                    socketRef.current.emit('user_joined', {
                        roomId: roomData.roomId,
                        user: currentUser
                    });

                    socketRef.current.on('receive_message', (message) => {
                        dispatch(addMessage(message));
                    });

                    socketRef.current.on('user_joined', (user) => {
                        dispatch(addMember(user));
                    });

                    socketRef.current.on('user_left', (userId) => {
                        dispatch(removeMember(userId));
                    });

                    socketRef.current.on('room_ended', () => {
                        toast.info("The host has ended the room.");
                        dispatch(clearRoom());
                        dispatch(clearMessages());
                        navigate('/dashboard');
                    });

                    socketRef.current.on('video_play', () => {
                        if (videoRef.current) {
                            videoRef.current.play().catch(e => console.log(e));
                            setIsPlaying(true);
                        }
                    });

                    socketRef.current.on('video_pause', () => {
                        if (videoRef.current) {
                            videoRef.current.pause();
                            setIsPlaying(false);
                        }
                    });

                    socketRef.current.on('video_seek', (time) => {
                        if (videoRef.current) {
                            if (Math.abs(videoRef.current.currentTime - time) > 1) {
                                videoRef.current.currentTime = time;
                            }
                        }
                    });
                }

                setIsLoading(false);
            } catch (error) {
                navigate('/dashboard');
            }
        };

        fetchRoomAndChats();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [id, dispatch, navigate, currentUser]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const leaveRoom = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/rooms/leave`, {
                roomId: currentRoom.roomId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                if (isHost) {
                    socketRef.current.emit('room_ended', currentRoom.roomId);
                } else {
                    socketRef.current.emit('user_left', {
                        roomId: currentRoom.roomId,
                        userId: currentUser._id
                    });
                }

                dispatch(clearRoom());
                dispatch(clearMessages());
                navigate('/dashboard');
            }
        } catch (error) {
            navigate('/dashboard');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/chats/send`, {
                roomId: currentRoom.roomId,
                message: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                dispatch(addMessage(response.data.chat));

                socketRef.current.emit('send_message', {
                    roomId: currentRoom.roomId,
                    message: response.data.chat
                });

                setNewMessage("");
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const togglePlay = () => {
        if (!isHost || !videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    };

    const handlePlay = () => {
        setIsPlaying(true);
        if (isHost && socketRef.current) {
            socketRef.current.emit('video_play', currentRoom.roomId);
        }
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (isHost && socketRef.current) {
            socketRef.current.emit('video_pause', currentRoom.roomId);
        }
    };

    const handleSeekInput = (e) => {
        if (!isHost || !videoRef.current) return;
        const newTime = parseFloat(e.target.value);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);

        socketRef.current.emit('video_seek', {
            roomId: currentRoom.roomId,
            time: newTime
        });
    };

    const handleSeekEvent = (e) => {
        if (isHost && socketRef.current) {
            socketRef.current.emit('video_seek', {
                roomId: currentRoom.roomId,
                time: e.target.currentTime
            });
        }
    };

    const openAddFriendModal = () => {
        setIsAddFriendModalOpen(true);
        setFriendSearchQuery("");
        setSelectedFriends([]);
    };

    const closeAddFriendModal = () => {
        setIsAddFriendModalOpen(false);
        setFriendSearchQuery("");
        setSelectedFriends([]);
    };

    const toggleFriendSelection = (friendId) => {
        setSelectedFriends(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    const confirmAddFriends = async () => {
        try {
            const onlineFriendsToInvite = [];
            const offlineFriendsToInvite = [];

            selectedFriends.forEach(id => {
                if (onlineUsers.includes(id)) {
                    onlineFriendsToInvite.push(id);
                } else {
                    offlineFriendsToInvite.push(id);
                }
            });
            
            const totalInvited = selectedFriends.length;
            toast.success(totalInvited === 1 ? "Invitation sent!" : "Invitations sent!");

            closeAddFriendModal(); 

            onlineFriendsToInvite.forEach(friendId => {
                if (socketRef.current) {
                    socketRef.current.emit('send_room_invite', {
                        receiverId: friendId,
                        roomId: currentRoom.roomId,
                        hostName: currentUser.name
                    });
                }
            });

            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/rooms/invite`, {
                roomId: currentRoom.roomId,
                offlineFriendIds: offlineFriendsToInvite,
                onlineFriendIds: onlineFriendsToInvite 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send invites");
        }
    };

    if (isLoading || !currentUser || !currentRoom) {
        return <div className="flex justify-center items-center h-screen text-white">Loading Room...</div>;
    }

    return (
        <div className="h-screen overflow-hidden bg-transparent">
            <div className="grid grid-rows-[auto_1fr] h-[100svh] overflow-hidden">
                <header className="flex justify-between items-center py-4 px-6 bg-[#111] border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <button className="bg-transparent border-none text-[#ccc] text-2xl cursor-pointer p-1 hover:text-white transition-colors" onClick={toggleSidebar}>☰</button>
                        <h1 className="m-0 flex items-center gap-2.5">
                            <span className="text-[1.2rem] font-medium text-[#b3b3b3]">ROOM</span>
                            <span className="bg-[#ff5c00] text-white px-3 py-1 rounded-md text-[1.4rem] tracking-widest font-bold">
                                {currentRoom.roomId}
                            </span>
                        </h1>
                    </div>
                    <button className="bg-[#ff4d4d]/15 border border-[#ff4d4d]/40 text-[#ff4d4d] px-3.5 py-1.5 rounded-md text-[0.85rem] cursor-pointer transition-all duration-200 hover:bg-[#ff4d4d]/25" onClick={leaveRoom}>
                        {isHost ? 'End Room' : 'Leave Room'}
                    </button>
                </header>

                <main className={`grid min-h-0 h-full overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${!isSidebarOpen ? 'grid-cols-[0_1fr_320px]' : 'grid-cols-[260px_1fr_320px]'}`}>

                    <aside className={`bg-black/40 border-r border-white/10 flex flex-col h-full min-h-0 transition-opacity duration-200 ease-in-out ${!isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <h2 className="text-[1.2rem] mb-4 font-bold">Members</h2>
                            <ul className="list-none p-0 mt-4 flex flex-col gap-3">
                                {/* Host Member - Always online technically since they are in the room */}
                                <li className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(currentRoom.host.name)} flex items-center justify-center text-white font-bold text-xs ring-2 ring-accent/30`}>
                                            {currentRoom.host.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="absolute bottom-[-1px] right-[-1px] w-[9px] h-[9px] bg-[#43e97b] border-[1.5px] border-[#111] rounded-full z-10 shadow-[0_0_5px_rgba(67,233,123,0.6)]"></span>
                                    </div>
                                    <span className="font-bold text-accent text-[0.9rem] truncate">{currentRoom.host.name} (Host)</span>
                                </li>
                                {/* Regular Members */}
                                {currentRoom.members.map((member) => (
                                    <li key={member._id} className="flex items-center gap-3 opacity-90">
                                        <div className="relative shrink-0">
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(member.name)} flex items-center justify-center text-white font-bold text-xs`}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="absolute bottom-[-1px] right-[-1px] w-[9px] h-[9px] bg-[#43e97b] border-[1.5px] border-[#111] rounded-full z-10 shadow-[0_0_5px_rgba(67,233,123,0.6)]"></span>
                                        </div>
                                        <span className="text-[0.9rem] truncate">{member.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 border-t border-white/10 shrink-0 bg-black/20">
                            <button
                                onClick={openAddFriendModal}
                                className="w-full flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg transition-colors text-[0.9rem] font-medium cursor-pointer border border-white/10"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add Friends
                            </button>
                        </div>
                    </aside>

                    <div className="flex items-center justify-center bg-black/35 relative group">
                        <video
                            ref={videoRef}
                            id="roomVideo"
                            preload="metadata"
                            src={currentRoom.link}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onSeeked={handleSeekEvent}
                            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                            onLoadedMetadata={(e) => setDuration(e.target.duration)}
                            onClick={togglePlay}
                            className={`w-[85%] max-w-[1000px] max-h-[85vh] rounded-xl bg-black shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${!isHost ? 'pointer-events-none' : 'cursor-pointer'}`}
                        >
                            Your browser does not support the video tag.
                        </video>

                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[80%] max-w-[900px] z-10 bg-black/60 backdrop-blur-md px-5 py-3.5 rounded-xl border border-white/10 flex items-center gap-4 shadow-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            {isHost && (
                                <button onClick={togglePlay} className="text-white hover:text-accent transition-colors outline-none flex-shrink-0">
                                    {isPlaying ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            )}

                            <div className="text-white/80 text-[0.8rem] font-semibold tracking-wider w-[45px] text-right flex-shrink-0">
                                {formatTime(currentTime)}
                            </div>

                            <div className="relative flex-1 h-1.5 bg-white/20 rounded-full flex items-center">
                                <div
                                    className="absolute left-0 top-0 h-full bg-accent rounded-full pointer-events-none transition-all duration-75 ease-linear"
                                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                />
                                {isHost && (
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 0}
                                        step="0.1"
                                        value={currentTime}
                                        onChange={handleSeekInput}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                )}
                            </div>

                            <div className="text-white/80 text-[0.8rem] font-semibold tracking-wider w-[45px] text-left flex-shrink-0">
                                {formatTime(duration)}
                            </div>
                        </div>
                    </div>

                    <aside className="bg-black/45 border-l border-white/10 flex flex-col h-full min-h-0 overflow-hidden">
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                            {messages.map((msg) => {
                                const isOwnMessage = String(msg.sender._id) === String(currentUser._id);
                                const isSenderHost = String(msg.sender._id) === String(currentRoom.host._id);

                                return (
                                    <div key={msg._id} className={`flex w-full gap-2.5 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(msg.sender.name)} flex items-center justify-center text-white font-bold text-[0.7rem] shrink-0 mt-[18px] shadow-sm`}>
                                            {msg.sender.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                            <span className={`text-[0.65rem] font-semibold opacity-60 mb-1 px-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                                                {isOwnMessage ? 'You' : `${msg.sender.name} ${isSenderHost ? '(Host)' : ''}`}
                                            </span>
                                            <div className={`px-3.5 py-2 text-[0.85rem] leading-snug shadow-sm ${isOwnMessage ? 'bg-accent text-black rounded-xl rounded-tr-sm' : 'bg-[#2a2a2a] text-white rounded-xl rounded-tl-sm border border-white/5'}`}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>
                        <form className="shrink-0 flex gap-2 p-2.5 border-t border-white/10 bg-[#0f0f0f]" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                autoComplete="off"
                                required
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 py-2.5 px-3 bg-[#1a1a1a] border-none rounded-md text-white outline-none focus:ring-1 focus:ring-accent transition-all"
                            />
                            <button type="submit" className="py-2.5 px-4 bg-accent text-white border-none rounded-md font-semibold cursor-pointer transition-colors hover:bg-accentHover">Send</button>
                        </form>
                    </aside>

                </main>
            </div>

            {/* Add Friends Modal */}
            <div
                className={`fixed inset-0 flex justify-center items-center z-[100] transition-all duration-300 ${isAddFriendModalOpen ? 'bg-black/55 backdrop-blur-md opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={closeAddFriendModal}
            >
                <div className="bg-[#111] p-8 w-full max-w-[420px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.8)] relative animate-popIn max-h-[85vh] flex flex-col border border-white/10" onClick={(e) => e.stopPropagation()}>
                    <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white z-10" onClick={closeAddFriendModal}>&times;</button>
                    <h2 className="mb-6 text-center text-2xl font-bold">Invite Friends</h2>

                    {friendsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center bg-[#161616] rounded-xl border border-[#333] border-dashed mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#444] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-white font-medium text-[1.05rem]">You don't have any friends.</p>
                            <p className="text-[#888] text-[0.85rem] mt-1.5 max-w-[220px]">Add friends from the Dashboard to invite them to rooms.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 shrink-0 relative">
                                <input
                                    type="text"
                                    placeholder="Search your friends..."
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#333] bg-[#161616] text-white text-[0.95rem] focus:outline-none focus:border-accent transition-colors"
                                    value={friendSearchQuery}
                                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[150px]">
                                {filteredFriends.length === 0 ? (
                                    <p className="text-center text-[#888] text-[0.9rem] py-6">No friends found matching "{friendSearchQuery}".</p>
                                ) : (
                                    filteredFriends.map(friend => {
                                        const isSelected = selectedFriends.includes(friend._id);
                                        const isAlreadyInRoom = usersInRoom.includes(String(friend._id));

                                        // --- CHECKING ONLINE STATUS HERE ---
                                        const isOnline = onlineUsers.includes(friend._id);

                                        return (
                                            <div
                                                key={friend._id}
                                                onClick={() => {
                                                    if (!isAlreadyInRoom) toggleFriendSelection(friend._id);
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 select-none ${isAlreadyInRoom
                                                        ? 'bg-[#111] border-[#222] opacity-50 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'cursor-pointer bg-accent/15 border-accent shadow-[0_0_15px_rgba(255,92,0,0.15)]'
                                                            : 'cursor-pointer bg-[#161616] border-[#333] hover:border-[#555]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="relative shrink-0">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg border ${isAlreadyInRoom ? 'bg-[#222] border-[#333] text-[#666]' : `bg-gradient-to-br ${getAvatarGradient(friend.name)} border-white/10`}`}>
                                                            {friend.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {isOnline && !isAlreadyInRoom && (
                                                            <span className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#43e97b] border-[2.5px] border-[#111] rounded-full z-10 shadow-[0_0_8px_rgba(67,233,123,0.6)]"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className={`font-semibold text-[0.95rem] truncate flex items-center gap-2 ${isAlreadyInRoom ? 'text-[#666]' : 'text-white'}`}>
                                                            {friend.name}
                                                            {isOnline && !isAlreadyInRoom && <span className="text-[0.65rem] text-[#43e97b] font-bold uppercase tracking-wider">Online</span>}
                                                        </span>
                                                        <span className="text-[0.75rem] text-textSecondary truncate">{friend.email}</span>
                                                    </div>
                                                </div>

                                                {isAlreadyInRoom ? (
                                                    <span className="text-[0.75rem] font-medium text-[#666] tracking-wide px-2 shrink-0">In Room</span>
                                                ) : (
                                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors shrink-0 ${isSelected ? 'bg-accent border-accent' : 'border-[#555] bg-[#111]'}`}>
                                                        {isSelected && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}

                    <button
                        onClick={confirmAddFriends}
                        disabled={friendsList.length === 0 || selectedFriends.length === 0}
                        className={`mt-6 w-full py-3.5 rounded-lg font-bold text-[1rem] transition-all duration-200 ${friendsList.length === 0 || selectedFriends.length === 0 ? 'bg-[#333] text-[#666] cursor-not-allowed' : 'bg-accent text-white hover:bg-accentHover shadow-[0_0_20px_rgba(255,92,0,0.3)]'}`}
                    >
                        {selectedFriends.length > 0 ? `Add Friends (${selectedFriends.length})` : 'Add Friends'}
                    </button>
                </div>
            </div>
        </div>
    );
}