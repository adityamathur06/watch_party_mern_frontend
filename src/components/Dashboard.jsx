import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, logoutUser, setOnlineUsers } from '../redux/userSlice';
import { setRoom } from '../redux/roomSlice';
import axios from 'axios';
import { baseUrl } from '../utils/api';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

export const getAvatarGradient = (name) => {
    if (!name) return 'from-[#ff5c00] to-[#ff8c42]';
    const gradients = [
        'from-[#ff5c00] to-[#ff8c42]', 'from-[#4facfe] to-[#00f2fe]', 
        'from-[#43e97b] to-[#38f9d7]', 'from-[#fa709a] to-[#fee140]', 
        'from-[#667eea] to-[#764ba2]', 'from-[#f83600] to-[#f9d423]', 
        'from-[#16a085] to-[#f4d03f]', 'from-[#ff0844] to-[#ffb199]',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
};

export default function Dashboard({ setIsAuth }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [generatedRoomId, setGeneratedRoomId] = useState('');
    const [videoLink, setVideoLink] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();

    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const dispatch = useDispatch();

    const currentUser = useSelector((state) => state.user.currentUser);
    const onlineUsers = useSelector((state) => state.user.onlineUsers);
    
    const userName = currentUser ? currentUser.name : 'User';
    const friendsList = currentUser?.friends || [];
    
    const formattedJoinDate = currentUser?.createdAt 
        ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
        : 'Recently';

    // Moved this up so the Socket Hook can use it for the Toast button
    const joinRoomByCode = async (code) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/rooms/join`, {
                roomId: code
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                dispatch(setRoom(response.data.room));
                toast.dismiss(); // Closes any lingering invite toasts
                toast.success("Joined room successfully!");
                navigate(`/room/${response.data.room._id}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Room does not exist");
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- UPDATED: LOCAL STORAGE AUTH BRIDGE ---
    useEffect(() => {
        let inviteCode = searchParams.get('invite');
        
        if (!inviteCode) {
            inviteCode = localStorage.getItem('pendingInvite');
        }

        if (inviteCode) {
            setJoinRoomId(inviteCode.toUpperCase());
            setActiveModal('join-room');
            searchParams.delete('invite');
            setSearchParams(searchParams);
            localStorage.removeItem('pendingInvite');
        }
    }, [searchParams, setSearchParams]);

    // --- UPDATED: PREMIUM TOAST UI & PERSISTENCE ---
    useEffect(() => {
        if (!currentUser) return;
        const socket = io(baseUrl);
        
        socket.emit('register_user', currentUser._id);
        socket.on('online_users', (users) => dispatch(setOnlineUsers(users)));

        socket.on('receive_room_invite', (data) => {
            toast(
                <div className="flex flex-col p-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(data.hostName)} flex items-center justify-center text-white font-bold text-[1.1rem] shadow-inner shrink-0`}>
                            {data.hostName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-white font-bold text-[1rem] truncate">{data.hostName}</span>
                            <span className="text-[#aaa] text-[0.8rem] truncate">invited you to a Watch Party</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => joinRoomByCode(data.roomId)}
                        className="w-full bg-accent text-white py-2.5 rounded-lg text-[0.9rem] font-bold hover:bg-accentHover transition-colors border-none cursor-pointer shadow-[0_0_15px_rgba(255,92,0,0.2)]"
                    >
                        Join Room {data.roomId}
                    </button>
                </div>, 
                { 
                    position: "top-right", 
                    autoClose: false, // Disables the disappearing timer completely
                    closeOnClick: false, // Prevents accidental closing if clicked
                    draggable: false, // Must click the "x" to dismiss
                    theme: "dark",
                    className: "border border-[#333] bg-[#161616] rounded-xl shadow-2xl", // Custom aesthetic
                }
            );
        });

        return () => socket.disconnect();
    }, [currentUser, dispatch]);

    const generateId = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        let l = "";
        let n = "";
        for (let i = 0; i < 4; i++) l += letters.charAt(Math.floor(Math.random() * letters.length));
        for (let i = 0; i < 4; i++) n += numbers.charAt(Math.floor(Math.random() * numbers.length));
        return `${l}-${n}`;
    };

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
    const openRoomTypeModal = () => setActiveModal('room-type');
    const openJoinModal = () => setActiveModal('join-room');
    const openFriendsModal = () => {
        setIsDropdownOpen(false);
        setActiveModal('friends');
    };
    
    const closeModal = () => {
        setActiveModal(null);
        setVideoLink('');
        setJoinRoomId('');
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        dispatch(logoutUser());
        setIsAuth(false);
        navigate('/');
    };

    const handleSelectChatRoom = () => {
        if (!videoLink.trim()) {
            toast.warning("Please provide a video link first.");
            return;
        }
        setGeneratedRoomId(generateId());
        setActiveModal('room-code');
        toast.success("Room created successfully!");
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedRoomId);
        toast.success("Room code copied!");
    };

    const createAndGoToRoom = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/rooms/create`, {
                roomId: generatedRoomId,
                link: videoLink
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                dispatch(setRoom(response.data.room));
                navigate(`/room/${response.data.room._id}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create room");
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        joinRoomByCode(joinRoomId);
    };

    const handleSearchUsers = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${baseUrl}/api/users/search?query=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSearchResults(response.data.users);
                if (response.data.users.length === 0) {
                    toast.info("No users found.");
                }
            }
        } catch (error) {
            toast.error("Error searching for users.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async (friendId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/users/add-friend`, {
                friendId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                dispatch(setUser(response.data.user)); 
                setSearchResults(prev => prev.filter(user => user._id !== friendId)); 
                toast.success("Friend added successfully!");
                setSearchQuery('');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add friend");
        }
    };

    const handleRemoveFriend = async (friendId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/users/remove-friend`, {
                friendId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                dispatch(setUser(response.data.user)); 
                toast.success("Friend removed.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove friend");
        }
    };

    const btnBase = "px-6 py-3 rounded-lg text-base cursor-pointer transition-all duration-200 ease-in";
    const btnPrimary = `${btnBase} text-white bg-accent hover:bg-accentHover`;
    const btnSecondary = `${btnBase} bg-transparent text-white border border-[#444] hover:bg-[#222]`;
    const inputStyle = "w-full p-3.5 bg-[#2a2a2a] border-2 border-[#3a3a3a] rounded-lg text-white text-base transition-all duration-300 focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20 placeholder:text-[#888] placeholder:tracking-normal tracking-widest";

    return (
        <>
            <header className="bg-[#0f0f0f]/90 backdrop-blur-sm h-16 px-8 flex items-center justify-between border-b border-[#222]">
                <div className="text-xl font-semibold tracking-wide">Watch Party</div>
                
                <div className="relative" ref={dropdownRef}>
                    <button 
                        className="bg-transparent border border-[#333] hover:border-accent/70 text-white pl-2 pr-4 py-1.5 rounded-full text-[0.9rem] cursor-pointer flex items-center gap-2.5 transition-all duration-300" 
                        onClick={toggleDropdown}
                    >
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(userName)} flex items-center justify-center text-white font-bold text-[0.7rem] shrink-0`}>
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">Profile</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-textSecondary transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-[calc(100%+12px)] bg-[#111] border border-[#333] rounded-xl min-w-[240px] shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-popIn origin-top-right">
                            <div className="p-4 border-b border-[#222] bg-[#161616] flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(userName)} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-inner`}>
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <p className="font-bold text-white text-[1.05rem] truncate">{userName}</p>
                                    <p className="text-textSecondary text-[0.7rem]">Joined {formattedJoinDate}</p>
                                </div>
                            </div>
                            <div className="p-2 flex flex-col gap-1">
                                <button 
                                    className="w-full bg-transparent border-none text-white flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg cursor-pointer text-[0.9rem] hover:bg-[#222] transition-colors" 
                                    onClick={openFriendsModal}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    Friends
                                </button>
                                <button 
                                    className="w-full bg-transparent border-none text-[#ff4d4d] flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg cursor-pointer text-[0.9rem] hover:bg-[#ff4d4d]/10 transition-colors" 
                                    onClick={handleLogout}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            
            <main className="max-w-[900px] mx-auto px-8 py-12 flex flex-col items-center text-center">
                <section className="flex flex-col items-center text-center">
                    <h1 className="text-5xl font-bold mb-2">Watch Party</h1>
                    <p className="text-xl text-textSecondary mb-6 mx-auto">Watch movies together. Talk in real time.</p>
                    <p className="max-w-[600px] text-base leading-relaxed text-textSecondary mb-6 mx-auto">
                        Watch Party lets you create private rooms where you and your friends
                        can watch videos together in sync and chat in real time — no matter
                        where you are.
                    </p>
                    <p className="text-[0.95rem] text-textSecondary">
                        Built by <strong className="text-white">Aditya</strong>
                    </p>
                </section>

                <section className="mt-12 flex gap-6">
                    <button className={btnPrimary} onClick={openRoomTypeModal}>
                        Create a Room
                    </button>
                    <button className={btnSecondary} onClick={openJoinModal}>
                        Join a Room
                    </button>
                </section>
            </main>

            <div 
                className={`fixed inset-0 flex justify-center items-center z-[100] transition-all duration-300 ${activeModal ? 'bg-black/55 backdrop-blur-md opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
                onClick={closeModal}
            >
                {activeModal === 'room-type' && (
                    <div className="bg-bgLight p-8 w-full max-w-[380px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative animate-popIn" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white" onClick={closeModal}>&times;</button>
                        <h2 className="mb-5 text-center text-2xl font-bold">Create a Room</h2>
                        <input 
                            type="text" 
                            placeholder="Paste Video Link Here" 
                            className={`${inputStyle} mb-6`}
                            value={videoLink}
                            onChange={(e) => setVideoLink(e.target.value)}
                            required 
                        />
                        <p className="mb-4 text-[#bbbbbb] text-[0.95rem] text-center">What kind of room do you want to create?</p>
                        
                        <div className="flex gap-4 w-full">
                            <button className={`${btnPrimary} flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-0`} onClick={handleSelectChatRoom}>
                                Chat Room
                            </button>
                            <button className={`${btnSecondary} flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-0 opacity-50 cursor-not-allowed`} disabled>
                                VC Room
                                <span className="bg-white/10 text-[#aaaaaa] px-2 py-1 rounded-xl text-[0.7rem] uppercase tracking-wide">Coming soon</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeModal === 'room-code' && (
                    <div className="bg-bgLight p-8 w-full max-w-[380px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative animate-popIn" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white" onClick={closeModal}>&times;</button>
                        <h2 className="mb-5 text-center text-2xl font-bold">Your Room is Ready</h2>
                        <p className="mb-4 text-[#bbbbbb] text-[0.95rem] text-center">Share this code with your friends</p>

                        <div className="flex items-center justify-between gap-3 px-3.5 py-3 my-6 bg-[#111] border border-white/15 rounded-lg">
                            <span className="text-lg tracking-[2px] font-semibold text-accent select-text">{generatedRoomId}</span>
                            <button className="bg-white/10 border border-white/15 text-white px-2.5 py-1.5 rounded-md text-[0.7rem] cursor-pointer transition-all hover:bg-white/15 hover:border-white/25 active:scale-95" onClick={copyToClipboard}>Copy</button>
                        </div>

                        <button className={`${btnPrimary} w-full mx-auto block mt-6`} onClick={createAndGoToRoom}>Go to Room</button>
                    </div>
                )}

                {activeModal === 'join-room' && (
                    <div className="bg-bgLight p-8 w-full max-w-[380px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative animate-popIn" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white" onClick={closeModal}>&times;</button>
                        <h2 className="mb-5 text-center text-2xl font-bold">Join a Room</h2>
                        <p className="mb-4 text-[#bbbbbb] text-[0.95rem] text-center">Enter the room code shared by your friend</p>
                        
                        <form className="flex flex-col gap-4" onSubmit={handleJoinRoom}>
                            <input 
                                type="text" 
                                placeholder="Room Code (ABCD-1234)" 
                                className={`${inputStyle} uppercase`} 
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                required 
                            />
                            <button type="submit" className={btnPrimary}>Join Room</button>
                        </form>
                    </div>
                )}

                {activeModal === 'friends' && (
                    <div className="bg-bgLight p-8 w-full max-w-[420px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative animate-popIn max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white z-10" onClick={closeModal}>&times;</button>
                        <h2 className="mb-5 text-center text-2xl font-bold">Friends</h2>

                        <form className="flex gap-2 mb-6 shrink-0" onSubmit={handleSearchUsers}>
                            <input 
                                type="text" 
                                placeholder="Search by name or email..." 
                                className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#333] bg-[#111] text-white text-[0.9rem] focus:outline-none focus:border-accent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="bg-accent text-white px-4 py-2.5 rounded-lg font-medium hover:bg-accentHover transition-colors disabled:opacity-50" disabled={isSearching}>
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="mb-6 bg-[#161616] border border-[#333] rounded-xl p-3 shrink-0">
                                <h3 className="text-[0.8rem] text-textSecondary uppercase tracking-widest mb-3 font-semibold">Search Results</h3>
                                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                                    {searchResults.map(user => {
                                        const isAlreadyFriend = friendsList.some(f => f._id === user._id);
                                        return (
                                            <div key={user._id} className="flex items-center justify-between bg-[#111] p-3 rounded-lg border border-[#222]">
                                                <div className="flex items-center gap-3 overflow-hidden mr-2">
                                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-semibold text-[0.95rem] truncate">{user.name}</span>
                                                        <span className="text-[0.75rem] text-textSecondary truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleAddFriend(user._id)}
                                                    disabled={isAlreadyFriend}
                                                    className={`px-3 py-1.5 rounded-md text-[0.8rem] font-medium transition-colors shrink-0 ${isAlreadyFriend ? 'bg-[#222] text-[#888] cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                                >
                                                    {isAlreadyFriend ? 'Added' : 'Add'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <h3 className="text-[0.8rem] text-textSecondary uppercase tracking-widest mb-3 font-semibold shrink-0">Your Friends</h3>
                            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                                {friendsList.length > 0 ? (
                                    friendsList.map(friend => {
                                        const isOnline = onlineUsers.includes(friend._id);
                                        return (
                                            <div key={friend._id} className="flex items-center justify-between bg-[#111] p-3 rounded-lg border border-[#222] group hover:border-[#333] transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="relative shrink-0">
                                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(friend.name)} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                                                            {friend.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {isOnline && (
                                                            <span className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#43e97b] border-[2.5px] border-[#111] rounded-full z-10 shadow-[0_0_8px_rgba(67,233,123,0.6)]"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-semibold text-[0.95rem] truncate flex items-center gap-2">
                                                            {friend.name}
                                                            {isOnline && <span className="text-[0.65rem] text-[#43e97b] font-bold uppercase tracking-wider">Online</span>}
                                                        </span>
                                                        <span className="text-[0.75rem] text-textSecondary truncate">{friend.email}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveFriend(friend._id)}
                                                    className="text-[#444] hover:text-[#ff4d4d] transition-colors p-2 bg-transparent border-none cursor-pointer flex-shrink-0"
                                                    title="Remove Friend"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-[#111] rounded-lg border border-[#222] border-dashed">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#444] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <p className="text-textSecondary text-[0.9rem]">No friends yet.</p>
                                        <p className="text-[#666] text-[0.75rem] mt-1 max-w-[200px]">Search for users above to add them to your friends list.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}