import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { baseUrl } from "../utils/api";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/userSlice";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";

// FIXED: Moved PasswordToggle OUTSIDE the main component and passed state as props
const PasswordToggle = ({ showPassword, setShowPassword }) => (
    <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#fff] cursor-pointer w-5 h-5 flex items-center justify-center transition-colors"
        tabIndex="-1"
    >
        <FontAwesomeIcon icon={faEye} />
        <span
            className={`absolute w-[110%] h-[2px] bg-current rounded-full transform -rotate-45 transition-all duration-300 ease-out origin-center
            ${showPassword ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'}`}
        ></span>
    </button>
);

export default function Landing({ setIsAuth }) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    
    const [signupStep, setSignupStep] = useState(1);
    const [otpValue, setOtpValue] = useState("");
    const [timeLeft, setTimeLeft] = useState(300); 
    const [expireTime, setExpireTime] = useState(null);

    const [typedTitle, setTypedTitle] = useState("");
    const fullTitle = "Watch-Party";

    const canvasRef = useRef(null);

    useEffect(() => {
        let timeout;
        let index = 0;
        
        const typeChar = () => {
            setTypedTitle(fullTitle.slice(0, index + 1));
            index++;
            if (index < fullTitle.length) {
                timeout = setTimeout(typeChar, 150);
            }
        };
        
        typeChar();
        
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const particles = Array.from({ length: 60 }).map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 1.5 + 0.5 
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const accentColor = '#ff5c00'; 
            const maxDistance = 150; 

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -1; }
                if (p.y < 0) { p.y = 0; p.vy *= -1; }
                if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -1; }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = accentColor;
                ctx.globalAlpha = 0.6; 
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const distance = Math.hypot(p.x - p2.x, p.y - p2.y);

                    if (distance < maxDistance) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        
                        const opacity = (1 - distance / maxDistance) * 0.4;
                        ctx.globalAlpha = opacity;
                        ctx.strokeStyle = accentColor;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

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
        setShowPassword(false);
        setActiveModal('login');
    };
    
    const openSignupModal = () => {
        setSignupStep(1);
        setOtpValue("");
        setShowPassword(false);
        setActiveModal('signup');
    };
    
    const closeModal = () => {
        setSignupStep(1);
        setShowPassword(false);
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
            // FIXED: Removed unused 'const response ='
            await axios.post(`${baseUrl}/api/auth/send-otp`, { email: formData.email });
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

    const btnBase = "px-7 py-3 rounded-xl text-base font-semibold tracking-wide cursor-pointer transition-all duration-300 ease-out transform active:scale-95";
    const btnPrimary = `${btnBase} text-white bg-[var(--accent-color,#ff5c00)] hover:shadow-[0_0_25px_var(--accent-color,#ff5c00)] hover:-translate-y-0.5`;
    const btnSecondary = `${btnBase} bg-[#141416]/80 text-white border border-[#2d2d30] hover:border-[var(--accent-color,#ff5c00)] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:-translate-y-0.5`;
    const inputStyle = "px-4 py-3 rounded-xl border border-[#27272a] bg-[#0e0e11] text-white text-[0.95rem] transition-all duration-300 focus:outline-none focus:border-[var(--accent-color,#ff5c00)] focus:ring-1 focus:ring-[var(--accent-color,#ff5c00)]";

    return (
        <div className="relative min-h-screen w-full bg-[#09090b] text-[#f4f4f5] overflow-hidden">
            
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_30%,transparent_100%)]"
            />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-color,#ff5c00)] opacity-[0.05] blur-[100px] rounded-full pointer-events-none" />

            <main className="relative z-10 min-h-screen flex flex-col justify-center items-center text-center p-6 max-w-4xl mx-auto">
                <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text bg-gradient-to-b from-white via-[#f4f4f5] to-[#a1a1aa]">
                    {typedTitle}
                    <span className="inline-block w-[4px] h-[45px] md:h-[55px] ml-1 bg-[var(--accent-color,#ff5c00)] animate-pulse shadow-[0_0_10px_var(--accent-color,#ff5c00)] align-middle" />
                </h1>
                
                <p className="text-lg md:text-xl text-[#a1a1aa] max-w-[480px] mb-10 font-medium leading-relaxed">
                    Watch movies together. Talk in real time.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
                    <button className={`${btnPrimary} w-full sm:w-auto min-w-[140px]`} onClick={openLoginModal}>Log in</button>
                    <button className={`${btnSecondary} w-full sm:w-auto min-w-[140px]`} onClick={openSignupModal}>Sign up</button>
                </div>
            </main>

            <div onClick={closeModal} className={`fixed inset-0 flex justify-center items-center z-[100] transition-all duration-300 ${activeModal ? 'bg-black/70 backdrop-blur-md opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                
                {activeModal === 'login' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[400px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors" onClick={closeModal}>&times;</button>
                        <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-white">Welcome Back</h2>

                        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                            <input className={inputStyle} onChange={handleChange} type="email" name="email" placeholder="Email Address" value={formData.email || ''} required />
                            <div className="relative w-full">
                                <input 
                                    className={`${inputStyle} w-full pr-12`} 
                                    onChange={handleChange} 
                                    type={showPassword ? "text" : "password"} 
                                    name="password" 
                                    placeholder="Password" 
                                    value={formData.password || ''} 
                                    required 
                                />
                                {/* FIXED: Passed state as props */}
                                <PasswordToggle showPassword={showPassword} setShowPassword={setShowPassword} />
                            </div>

                            <button type="submit" className={`${btnPrimary} mt-2`}>Login</button>
                        </form>
                    </div>
                )}

                {activeModal === 'signup' && (
                    <div className="bg-[#121215] border border-[#27272a] p-8 w-full max-w-[400px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] relative transition-all duration-300" onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-xl bg-transparent border-none text-[#71717a] cursor-pointer hover:text-white transition-colors" onClick={closeModal}>&times;</button>
                        <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-white">Create Account</h2>

                        {signupStep === 1 ? (
                            <form className="flex flex-col gap-4" onSubmit={(e) => handleSendOtp(e, false)}>
                                <input className={inputStyle} onChange={handleChange} type="text" name="name" placeholder="Full Name" value={formData.name || ''} required />
                                <input className={inputStyle} onChange={handleChange} type="email" name="email" placeholder="Email Address" value={formData.email || ''} required />
                                <div className="relative w-full">
                                    <input 
                                        className={`${inputStyle} w-full pr-12`} 
                                        onChange={handleChange} 
                                        type={showPassword ? "text" : "password"} 
                                        name="password" 
                                        placeholder="Secure Password" 
                                        value={formData.password || ''} 
                                        required 
                                    />
                                    {/* FIXED: Passed state as props */}
                                    <PasswordToggle showPassword={showPassword} setShowPassword={setShowPassword} />
                                </div>

                                <button type="submit" className={`${btnPrimary} mt-2`}>Send Verification Code</button>
                            </form>
                        ) : (
                            <form className="flex flex-col gap-4" onSubmit={handleSignup}>
                                <div className="text-[#a1a1aa] text-sm text-center mb-2 leading-relaxed">
                                    We sent a 6-digit verification code to <br/>
                                    <strong className="text-white font-medium">{formData.email}</strong>
                                </div>
                                
                                <input 
                                    className={`${inputStyle} text-center tracking-[0.4em] text-2xl font-bold font-mono bg-[#09090b] border-[#3f3f46] placeholder:tracking-normal placeholder:font-sans`} 
                                    type="text" 
                                    name="otp-code"
                                    autoComplete="one-time-code"
                                    value={otpValue}
                                    onChange={handleOtpChange} 
                                    placeholder="000000" 
                                    required 
                                />
                                
                                <div className="flex justify-between items-center px-1 my-1">
                                    <span className="text-sm text-[#71717a]">
                                        Expires in <strong className={timeLeft < 60 ? "text-[#f43f5e]" : "text-[#f4f4f5]"}>{formatTime(timeLeft)}</strong>
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleSendOtp(e, true)}
                                        disabled={timeLeft > 0}
                                        className={`text-sm border-none bg-transparent transition-colors ${timeLeft === 0 ? 'text-[var(--accent-color,#ff5c00)] hover:underline cursor-pointer font-semibold' : 'text-[#3f3f46] cursor-not-allowed'}`}
                                    >
                                        Resend Code
                                    </button>
                                </div>

                                <button type="submit" className={`${btnPrimary} mt-2`}>Verify & Complete Signup</button>
                                
                                <button 
                                    type="button" 
                                    onClick={() => setSignupStep(1)} 
                                    className="bg-transparent border-none text-[#71717a] hover:text-white text-sm cursor-pointer transition-colors mt-2 underline underline-offset-4"
                                >
                                    Change Email Address
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}