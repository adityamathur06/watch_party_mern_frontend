import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { baseUrl } from "../utils/api";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";
import { toast } from "react-toastify";

export default function Landing({ setIsAuth }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({});
    
    const [signupStep, setSignupStep] = useState(1);
    const [otpValue, setOtpValue] = useState("");
    const [timeLeft, setTimeLeft] = useState(300); 
    const [expireTime, setExpireTime] = useState(null);

    useEffect(() => {
        let timerId;
        
        if (signupStep === 2 && expireTime) {
            const calculateTimeLeft = () => {
                const now = Date.now();
                const differenceInSeconds = Math.floor((expireTime - now) / 1000);
                
                if (differenceInSeconds <= 0) {
                    setTimeLeft(0);
                    clearInterval(timerId);
                } else {
                    setTimeLeft(differenceInSeconds);
                }
            };

            calculateTimeLeft();
            timerId = setInterval(calculateTimeLeft, 1000);
        }
        
        return () => clearInterval(timerId); 
    }, [signupStep, expireTime]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleOtpChange = (e) => {
        const strictlyNumbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        setOtpValue(strictlyNumbers);
    };

    const openLoginModal = () => {
        setSignupStep(1);
        setActiveModal('login');
    };
    
    const openSignupModal = () => {
        setSignupStep(1);
        setOtpValue("");
        setActiveModal('signup');
    };
    
    const closeModal = () => {
        setSignupStep(1);
        setActiveModal(null);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${baseUrl}/api/auth/login`, formData);
            localStorage.setItem('token', response.data.token);
            dispatch(setUser(response.data.user));
            setIsAuth(true);
            toast.success("Login successful!");
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid email or password");
        }
    };

    const handleSendOtp = async (e, isResend = false) => {
        if (e) e.preventDefault();
        const targetTime = Date.now() + 300000;

        if (!isResend) {
            setSignupStep(2);
            setExpireTime(targetTime);
            setTimeLeft(300);
            setOtpValue("");
        } else {
            setExpireTime(targetTime);
            setTimeLeft(300);
            setOtpValue("");
        }

        try {
            toast.success(isResend ? "New code sent!" : "Verification code sent to email!");
            const response = await axios.post(`${baseUrl}/api/auth/send-otp`, { email: formData.email });
        } catch (error) {
            toast.error(error.response?.data?.message || "Error sending code");
            if (!isResend) {
                setSignupStep(1);
            }
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (otpValue.length !== 6) {
            toast.warning("Please enter all 6 digits");
            return;
        }

        try {
            const payload = { ...formData, otp: otpValue };
            const response = await axios.post(`${baseUrl}/api/auth/signup`, payload);
            
            toast.success(response.data.message);
            setSignupStep(1);
            setOtpValue("");
            setActiveModal("login");
            setFormData({});
        } catch (error) {
            toast.error(error.response?.data?.message || "Signup failed");
        }
    };

    const btnBase = "px-6 py-3 rounded-lg text-base cursor-pointer transition-all duration-200 ease-in";
    const btnPrimary = `${btnBase} text-white bg-accent hover:bg-accentHover`;
    const btnSecondary = `${btnBase} bg-transparent text-white border border-[#444] hover:bg-[#222]`;
    const inputStyle = "px-3.5 py-3 rounded-lg border border-[#333] bg-[#111] text-white text-[0.95rem] transition-colors duration-500 focus:outline-none focus:border-accent";

    return (
        <>
            <main className="min-h-screen flex flex-col justify-center items-center text-center p-8">
                <h1 className="text-5xl font-bold mb-2">Watch-Party</h1>
                <p className="text-[1.1rem] text-textSecondary max-w-[420px] mb-8">Watch movies together. Talk in real time.</p>
                <div className="flex gap-4">
                    <button className={btnPrimary} onClick={openLoginModal}>Log in</button>
                    <button className={btnSecondary} onClick={openSignupModal}>Sign up</button>
                </div>
            </main>

            <div onClick={closeModal} className={`fixed inset-0 flex justify-center items-center z-[100] transition-all duration-300 ${activeModal ? 'bg-black/55 backdrop-blur-md opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                
                {activeModal === 'login' && (
                    <div className="bg-bgLight p-8 w-full max-w-[380px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative animate-popIn" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white" onClick={closeModal}>&times;</button>
                        <h2 className="mb-5 text-center text-2xl font-bold">Login</h2>

                        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                            <input className={inputStyle} onChange={handleChange} type="email" name="email" placeholder="Email" required />
                            <input className={inputStyle} onChange={handleChange} type="password" name="password" placeholder="Password" required />
                            <button type="submit" className={btnPrimary}>Login</button>
                        </form>
                    </div>
                )}

                {activeModal === 'signup' && (
                    <div className="bg-bgLight p-8 w-full max-w-[380px] rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative animate-popIn" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-3 right-3.5 text-2xl bg-transparent border-none text-textSecondary cursor-pointer hover:text-white" onClick={closeModal}>&times;</button>
                        <h2 className="mb-5 text-center text-2xl font-bold">Signup</h2>

                        {signupStep === 1 ? (
                            <form className="flex flex-col gap-4" onSubmit={(e) => handleSendOtp(e, false)}>
                                <input className={inputStyle} onChange={handleChange} type="text" name="name" placeholder="Your Name" value={formData.name || ''} required />
                                <input className={inputStyle} onChange={handleChange} type="email" name="email" placeholder="Email" value={formData.email || ''} required />
                                <input className={inputStyle} onChange={handleChange} type="password" name="password" placeholder="Create Password" value={formData.password || ''} required />
                                <button type="submit" className={btnPrimary}>Send OTP</button>
                            </form>
                        ) : (
                            <form className="flex flex-col gap-4" onSubmit={handleSignup}>
                                <div className="text-[#bbb] text-sm text-center mb-2 leading-relaxed">
                                    We sent a 6-digit verification code to <br/>
                                    <strong className="text-white">{formData.email}</strong>
                                </div>
                                
                                <input 
                                    className={`${inputStyle} text-center tracking-[0.5em] text-xl font-bold font-mono placeholder:tracking-normal placeholder:font-sans`} 
                                    type="text" 
                                    name="otp-code"
                                    autoComplete="one-time-code"
                                    value={otpValue}
                                    onChange={handleOtpChange} 
                                    placeholder="000000" 
                                    required 
                                />
                                
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-sm text-[#888]">
                                        Expires in <strong className={timeLeft < 60 ? "text-[#ff4d4d]" : "text-white"}>{formatTime(timeLeft)}</strong>
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleSendOtp(e, true)}
                                        disabled={timeLeft > 0}
                                        className={`text-sm border-none bg-transparent transition-colors ${timeLeft === 0 ? 'text-accent hover:text-accentHover cursor-pointer font-bold underline' : 'text-[#555] cursor-not-allowed'}`}
                                    >
                                        Resend OTP
                                    </button>
                                </div>

                                <button type="submit" className={`${btnPrimary} mt-2`}>Verify & Signup</button>
                                
                                <button 
                                    type="button" 
                                    onClick={() => setSignupStep(1)} 
                                    className="bg-transparent border-none text-[#888] hover:text-white text-sm cursor-pointer transition-colors mt-1"
                                >
                                    Change Email
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}