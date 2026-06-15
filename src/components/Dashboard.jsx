import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, logoutUser, setOnlineUsers } from '../redux/userSlice';
import { setRoom } from '../redux/roomSlice';
import axios from 'axios';
import { baseUrl } from '../utils/api';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

// eslint-disable-next-line react-refresh/only-export-components
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

    const joinRoomByCode = useCallback(async (code) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${baseUrl}/api/rooms/join`, {
                roomId: code
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                dispatch(setRoom(response.data.room));
                toast.dismiss();
                toast.success("Joined room successfully!");
                navigate(`/room/${response.data.room._id}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Room does not exist");
        }
    }, [dispatch, navigate]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let inviteCode = searchParams.get('invite');
        
        if (!inviteCode) {
            inviteCode = localStorage.getItem('pendingInvite');
        }

        if (inviteCode) {
            setTimeout(() => {
                setJoinRoomId(inviteCode.toUpperCase());
                setActiveModal('join-room');
                searchParams.delete('invite');
                setSearchParams(searchParams);
                localStorage.removeItem('pendingInvite');
            }, 0);
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (!currentUser) return;
        const socket = io(baseUrl);
        
        socket.emit('register_user', currentUser._id);
        socket.on('online_users', (users) => dispatch(setOnlineUsers(users)));

        socket.on('receive_room_invite', (data) => {
            toast(
                <div className="flex flex-col p-1 font-sans">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(data.hostName)} flex items-center justify-center text-white font-bold text-[1.1rem] shadow-inner shrink-0`}>
                            {data.hostName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-white font-bold text-[1rem] truncate">{data.hostName}</span>
                            <span className="text-[#a1a1aa] text-[0.8rem] truncate">invited you to a Watch Party</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => joinRoomByCode(data.roomId)}
                        className="w-full bg-[var(--accent-color,#ff5c00)] text-white py-2.5 rounded-lg text-[0.9rem] font-bold transition-all duration-300 border-none cursor-pointer shadow-[0_0_15px_var(--accent-color,#ff5c00)] hover:brightness-110 active:scale-95"
                    >
                        Join Room {data.roomId}
                    </button>
                </div>, 
                { 
                    position: "top-right", 
                    autoClose: false,
                    closeOnClick: false,
                    draggable: false,
                    theme: "dark",
                    className: "border border-[#27272a] bg-[#121215] rounded-2xl shadow-2xl",
                }
            );
        });

        return () => socket.disconnect();
    }, [currentUser, dispatch, joinRoomByCode]);

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

    const openSettingsModal = () => {
        setIsDropdownOpen(false);
        setActiveModal('settings');
    }
    
    const closeModal = () => {
        setActiveModal(null);
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
                link: '' 
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
            console.error("Search error:", error);
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

    const btnBase = "px-7 py-3 rounded-xl text-base font-semibold tracking-wide cursor-pointer transition-all duration-300 ease-out transform active:scale-95";
    const btnPrimary = `${btnBase} text-white bg-[var(--accent-color,#ff5c00)] hover:shadow-[0_0_25px_var(--accent-color,#ff5c00)] hover:-translate-y-0.5`;
    const btnSecondary = `${btnBase} bg-[#141416]/80 text-white border border-[#2d2d30] hover:border-[var(--accent-color,#ff5c00)] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:-translate-y-0.5`;
    const inputStyle = "w-full px-4 py-3.5 bg-[#0e0e11] border border-[#27272a] rounded-xl text-white text-[0.95rem] transition-all duration-300 focus:outline-none focus:border-[var(--accent-color,#ff5c00)] focus:ring-1 focus:ring-[var(--accent-color,#ff5c00)] placeholder:text-[#71717a] placeholder:tracking-normal tracking-widest";

    return (
        <div className="relative min-h-screen w-full bg-[#09090b] text-[#f4f4f5] overflow-hidden font-sans">
            
            <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none overflow-hidden flex justify-center z-0">
                <div className="absolute -top-[200px] w-[90%] max-w-[800px] h-[450px] bg-[var(--accent-color,#ff5c00)] opacity-40 blur-[100px] rounded-full mix-blend-screen" />
                <div className="absolute -top-[150px] left-[10%] w-[60%] max-w-[600px] h-[400px] bg-[var(--accent-color,#ff5c00)] opacity-30 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute -top-[150px] right-[10%] w-[60%] max-w-[600px] h-[400px] bg-[var(--accent-color,#ff5c00)] opacity-20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <header className="relative z-20 bg-[#09090b]/40 backdrop-blur-xl h-20 px-8 flex items-center justify-between border-b border-[#27272a]/50">
                <div className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a1a1aa]">Watch-Party</div>
                
                <div className="relative" ref={dropdownRef}>
                    <button 
                        className="bg-[#141416]/80 backdrop-blur-md border border-[#27272a] hover:border-[var(--accent-color,#ff5c00)] text-white pl-2 pr-4 py-1.5 rounded-full text-[0.95rem] cursor-pointer flex items-center gap-3 transition-all duration-300 shadow-sm" 
                        onClick={toggleDropdown}
                    >
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(userName)} flex items-center justify-center text-white font-bold text-[0.8rem] shrink-0 shadow-inner`}>
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold tracking-wide">{userName}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-[#a1a1aa] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-[calc(100%+16px)] bg-[#121215]/95 backdrop-blur-xl border border-[#27272a] rounded-2xl min-w-[260px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-popIn origin-top-right">
                            <div className="p-5 border-b border-[#27272a] bg-[#18181b]/50 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(userName)} flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-inner`}>
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <p className="font-bold text-white text-[1.1rem] truncate">{userName}</p>
                                    <p className="text-[#a1a1aa] text-[0.75rem] font-medium">Joined {formattedJoinDate}</p>
                                </div>
                            </div>
                            <div className="p-2 flex flex-col gap-1">
                                <button 
                                    className="w-full bg-transparent border-none text-[#f4f4f5] flex items-center gap-3 px-4 py-3 text-left rounded-xl cursor-pointer text-[0.95rem] font-medium hover:bg-[#27272a]/50 transition-colors" 
                                    onClick={openFriendsModal}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    Friends Hub
                                </button>
                                <button 
                                    className="w-full bg-transparent border-none text-[#f4f4f5] flex items-center gap-3 px-4 py-3 text-left rounded-xl cursor-pointer text-[0.95rem] font-medium hover:bg-[#27272a]/50 transition-colors" 
                                    onClick={openSettingsModal}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Settings
                                </button>
                                <button 
                                    className="w-full bg-transparent border-none text-[#f43f5e] flex items-center gap-3 px-4 py-3 text-left rounded-xl cursor-pointer text-[0.95rem] font-medium hover:bg-[#f43f5e]/10 transition-colors" 
                                    onClick={handleLogout}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            
            <main className="relative z-10 max-w-[900px] mx-auto px-8 py-20 flex flex-col items-center text-center">
                <section className="flex flex-col items-center text-center w-full">
                    
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 py-2 leading-normal bg-clip-text text-transparent bg-gradient-to-b from-white via-[#f4f4f5] to-[#a1a1aa]">
                        Welcome, {userName}
                    </h1>
                    
                    <p className="text-xl md:text-2xl font-medium text-[#a1a1aa] mb-8">
                        Ready to start your Watch Party?
                    </p>
                    <p className="max-w-[550px] text-[1.05rem] leading-relaxed text-[#71717a] mb-12">
                        Create a private room to stream movies in sync with your friends, 
                        or enter an invite code to join an ongoing session.
                    </p>
                </section>

                <section className="flex flex-col sm:flex-row gap-5 w-full justify-center items-center">
                    <button className={`${btnPrimary} w-full sm:w-[220px] py-4 text-lg`} onClick={openRoomTypeModal}>
                        Create Room
                    </button>
                    <button className={`${btnSecondary} w-full sm:w-[220px] py-4 text-lg`} onClick={openJoinModal}>
                        Join Room
                    </button>
                </section>
            </main>

            <div 
                className={`fixed inset-0 flex justify-center items-center z-[100] transition-all duration-300 ${activeModal ? 'bg-black/70 backdrop-blur-md opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
                onClick={closeModal}
            >
                {activeModal === 'room-type' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[400px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors" onClick={closeModal}>&times;</button>
                        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-white">Create a Room</h2>
                        <p className="mb-6 text-[#a1a1aa] text-[0.95rem] text-center leading-relaxed">Select the type of room you want to host.</p>
                        
                        {/* REDESIGNED: Sleek Horizontal List Buttons */}
                        <div className="flex flex-col gap-3 w-full mt-4">
                            <button className={`${btnPrimary} w-full flex items-center justify-start px-5 py-4 gap-4`} onClick={handleSelectChatRoom}>
                                <span className="text-2xl bg-black/20 p-2 rounded-lg shrink-0">💬</span>
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-bold text-[1.05rem]">Chat Room</span>
                                    <span className="text-white/80 text-[0.8rem] font-normal leading-tight mt-0.5">Text-based sync & chat</span>
                                </div>
                            </button>
                            <button className={`${btnSecondary} w-full flex items-center justify-start px-5 py-4 gap-4 opacity-50 cursor-not-allowed`} disabled>
                                <span className="text-2xl bg-white/5 p-2 rounded-lg shrink-0 grayscale opacity-80">🎙️</span>
                                <div className="flex flex-col items-start text-left flex-1">
                                    <span className="font-bold text-[1.05rem] text-white">VC Room</span>
                                    <span className="text-[#a1a1aa] text-[0.8rem] font-normal leading-tight mt-0.5">Voice chat & watch</span>
                                </div>
                                <span className="bg-[#27272a] text-[#a1a1aa] px-2.5 py-1.5 rounded-md text-[0.65rem] uppercase tracking-wider font-bold shrink-0 shadow-inner border border-[#3f3f46]">Soon</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeModal === 'room-code' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[400px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors" onClick={closeModal}>&times;</button>
                        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-white">Room is Ready</h2>
                        <p className="mb-6 text-[#a1a1aa] text-[0.95rem] text-center leading-relaxed">Copy the code below and send it to your friends.</p>

                        <div className="flex items-center justify-between gap-3 px-4 py-4 my-6 bg-[#0e0e11] border border-[#27272a] rounded-xl shadow-inner">
                            <span className="text-xl tracking-[0.2em] font-bold text-[var(--accent-color,#ff5c00)] select-text">{generatedRoomId}</span>
                            <button className="bg-[#27272a]/50 border border-[#3f3f46] text-white px-4 py-2 rounded-lg text-[0.8rem] font-bold cursor-pointer transition-all hover:bg-[#3f3f46] active:scale-95" onClick={copyToClipboard}>Copy</button>
                        </div>

                        <button className={`${btnPrimary} w-full mx-auto block mt-2`} onClick={createAndGoToRoom}>Enter Room</button>
                    </div>
                )}

                {activeModal === 'join-room' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[400px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors" onClick={closeModal}>&times;</button>
                        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-white">Join a Room</h2>
                        <p className="mb-8 text-[#a1a1aa] text-[0.95rem] text-center leading-relaxed">Enter the 8-character invite code below.</p>
                        
                        <form className="flex flex-col gap-5" onSubmit={handleJoinRoom}>
                            <input 
                                type="text" 
                                placeholder="ABCD-1234" 
                                className={`${inputStyle} uppercase text-center text-xl tracking-[0.2em] font-mono`} 
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                required 
                            />
                            <button type="submit" className={btnPrimary}>Join Session</button>
                        </form>
                    </div>
                )}

                {activeModal === 'friends' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[440px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors z-10" onClick={closeModal}>&times;</button>
                        <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-white">Friends Hub</h2>

                        <form className="flex gap-3 mb-6 shrink-0" onSubmit={handleSearchUsers}>
                            <input 
                                type="text" 
                                placeholder="Search by name or email..." 
                                className="flex-1 px-4 py-3 rounded-xl border border-[#27272a] bg-[#0e0e11] text-white text-[0.95rem] transition-all duration-300 focus:outline-none focus:border-[var(--accent-color,#ff5c00)] placeholder-[#71717a]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="bg-[var(--accent-color,#ff5c00)] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50" disabled={isSearching}>
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="mb-6 bg-[#0e0e11] border border-[#27272a] rounded-xl p-3 shrink-0">
                                <h3 className="text-[0.75rem] text-[#a1a1aa] uppercase tracking-widest mb-3 font-bold px-1">Search Results</h3>
                                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                    {searchResults.map(user => {
                                        const isAlreadyFriend = friendsList.some(f => f._id === user._id);
                                        return (
                                            <div key={user._id} className="flex items-center justify-between bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
                                                <div className="flex items-center gap-3 overflow-hidden mr-2">
                                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner`}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-bold text-white text-[0.95rem] truncate">{user.name}</span>
                                                        <span className="text-[0.75rem] text-[#a1a1aa] truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleAddFriend(user._id)}
                                                    disabled={isAlreadyFriend}
                                                    className={`px-4 py-2 rounded-lg text-[0.8rem] font-bold transition-all shrink-0 ${isAlreadyFriend ? 'bg-[#27272a] text-[#71717a] cursor-not-allowed' : 'bg-white/10 text-white hover:bg-[var(--accent-color,#ff5c00)] hover:shadow-[0_0_15px_var(--accent-color,#ff5c00)] active:scale-95'}`}
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
                            <h3 className="text-[0.75rem] text-[#a1a1aa] uppercase tracking-widest mb-3 font-bold px-1 shrink-0">Your Friends</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                                {friendsList.length > 0 ? (
                                    friendsList.map(friend => {
                                        const isOnline = onlineUsers.includes(friend._id);
                                        return (
                                            <div key={friend._id} className="flex items-center justify-between bg-[#18181b] p-3 rounded-xl border border-[#27272a] group hover:border-[#3f3f46] transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="relative shrink-0">
                                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(friend.name)} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                                                            {friend.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {isOnline && (
                                                            <span className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#43e97b] border-[2.5px] border-[#18181b] rounded-full z-10 shadow-[0_0_8px_rgba(67,233,123,0.6)]"></span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-bold text-white text-[0.95rem] truncate flex items-center gap-2">
                                                            {friend.name}
                                                            {isOnline && <span className="text-[0.65rem] text-[#43e97b] font-extrabold uppercase tracking-widest">Online</span>}
                                                        </span>
                                                        <span className="text-[0.75rem] text-[#a1a1aa] truncate">{friend.email}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveFriend(friend._id)}
                                                    className="text-[#71717a] hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all p-2.5 rounded-lg bg-transparent border-none cursor-pointer flex-shrink-0"
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
                                    <div className="flex flex-col items-center justify-center py-10 text-center bg-[#0e0e11] rounded-xl border border-[#27272a] border-dashed">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#3f3f46] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <p className="text-[#f4f4f5] font-semibold text-[0.95rem]">No friends added yet.</p>
                                        <p className="text-[#71717a] text-[0.8rem] mt-1 max-w-[220px] leading-relaxed">Use the search bar above to connect with friends.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* SETTINGS MODAL */}
                {activeModal === 'settings' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[400px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors z-10" onClick={closeModal}>&times;</button>
                        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-white">Settings</h2>
                        <p className="mb-8 text-[#a1a1aa] text-[0.95rem] text-center leading-relaxed">Customize your Watch-Party experience.</p>
                        
                        <div className="flex flex-col items-center justify-center py-10 text-center bg-[#0e0e11] rounded-xl border border-[#27272a] border-dashed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#3f3f46] mb-3 animate-[spin_4s_linear_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-[#f4f4f5] font-semibold text-[0.95rem]">Theme Engine</p>
                            <p className="text-[#71717a] text-[0.8rem] mt-1 max-w-[220px] leading-relaxed">Color customization and preferences coming soon.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}