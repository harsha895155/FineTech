import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data.data);
                } catch (err) {
                    console.error("Auth check failed", err);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkLoggedIn();
    }, []);

    const login = async (email, password) => {
        try {
            setError(null);
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.data.token);
            setUser(res.data.data);
            return res.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            throw err;
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            const res = await api.post('/auth/signup', userData);
            // If verification is needed, return the response as is
            if (res.data.data && res.data.data.needsVerification) {
                return res.data;
            }
            localStorage.setItem('token', res.data.data.token);
            setUser(res.data.data);
            return res.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            throw err;
        }
    };

    const verifyOtp = async (email, otp) => {
        try {
            setError(null);
            const res = await api.post('/auth/verify-otp', { email, otp });
            localStorage.setItem('token', res.data.data.token);
            setUser(res.data.data);
            return res.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateProfile = async (updates) => {
        try {
            const res = await api.patch('/auth/profile', updates);
            setUser(res.data.data);
            return res.data.data;
        } catch (err) {
            console.error("Profile update failed", err);
            throw err;
        }
    };

    const resetProfileImage = async () => {
        try {
            const res = await api.delete('/auth/profile-image');
            setUser(prev => ({ ...prev, profileImage: res.data.profileImage }));
            return res.data.profileImage;
        } catch (err) {
            console.error("Profile image reset failed", err);
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, verifyOtp, logout, updateProfile, resetProfileImage }}>
            {children}
        </AuthContext.Provider>
    );
};
