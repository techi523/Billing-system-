import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminDashboard from '../components/SuperAdmin/SuperAdminDashboard';
import axios from 'axios';

const SuperAdminPortal = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');

            // Check if we have demo credentials
            if (token === 'demo-token' && user) {
                const userData = JSON.parse(user);
                if (userData.name === 'Demo Admin') {
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    return;
                }
            }

            // Check if we have real authentication
            if (token) {
                try {
                    // Try to verify token with backend
                    await axios.get('/api/v1/auth/verify', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setIsAuthenticated(true);
                } catch (err) {
                    // Token invalid, redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
            } else {
                // No token, redirect to login
                navigate('/login');
            }
            setIsLoading(false);
        };

        checkAuth();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-bold">Authenticating Super Admin...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
            {/* Super Admin Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Super Admin Dashboard</h1>
                            <p className="text-slate-600 font-bold">Platform-wide Governance & Control</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-600 text-xs font-black rounded-full">
                                SUPER ADMIN
                            </span>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    navigate('/login');
                                }}
                                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                <SuperAdminDashboard />
            </div>
        </div>
    );
};

export default SuperAdminPortal;
