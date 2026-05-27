import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { ToastContainer, Flip } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { setUser, logoutUser } from './redux/userSlice';
import { baseUrl } from './utils/api';

import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import Room from './components/Room';

function App() {
  const dispatch = useDispatch();
  const [isAuth, setIsAuth] = useState(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    if (inviteCode) {
      localStorage.setItem('pendingInvite', inviteCode);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsAuth(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          dispatch(logoutUser());
          setIsAuth(false);
          return;
        }

        const response = await axios.get(`${baseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          dispatch(setUser(response.data.user));
          setIsAuth(true);
        } else {
          setIsAuth(false);
        }

      } catch (error) {
        console.error('Authentication error:', error.message);
        localStorage.removeItem('token');
        dispatch(logoutUser());
        setIsAuth(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  if (isAuth === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white text-xl font-medium tracking-wide">
        Loading...
      </div>
    );
  }

  const ProtectedRoute = ({ children }) => {
    return isAuth ? children : <Navigate to="/" replace />;
  };

  const PublicRoute = ({ children }) => {
    return !isAuth ? children : <Navigate to="/dashboard" replace />;
  };

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <PublicRoute>
              <Landing setIsAuth={setIsAuth} />
            </PublicRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard setIsAuth={setIsAuth} />
            </ProtectedRoute>
          } />

          <Route path="/room/:id" element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          } />

          <Route path="*" element={
            <Navigate to={isAuth ? "/dashboard" : "/"} replace />
          } />
        </Routes>
      </BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        theme="light"
        transition={Flip}
      />
    </>
  );
}

export default App;