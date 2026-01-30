import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import BackButton from '../components/Common/BackButton';

const CustomerPortal = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [customerData, setCustomerData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');

            // Check if we have demo credentials
            if (token === 'demo-token' && user) {
                const userData = JSON.parse(user);
                if (userData.name === 'Demo Admin') {
                    setIsAuthenticated(true);
                    setCustomerData({
                        name: 'Demo Customer',
                        email: 'customer@demo.com',
                        currentPlan: 'Monthly Pro',
                        balance: 2500,
                        dataUsed: 45,
                        dataLimit: 100,
                        expires: '12 Days',
                        recentActivity: [
                            { action: 'Plan Renewal', date: '2 days ago', amount: '+KES 1,500' },
                            { action: 'Data Top-up', date: '1 week ago', amount: '+KES 500' },
                            { action: 'Payment Failed', date: '2 weeks ago', amount: '-KES 1,500' }
                        ]
                    });
                    setIsLoading(false);
                    return;
                }
            }

            // Check if we have real authentication
            if (token) {
                try {
                    // Try to verify token with backend
                    const res = await axios.get('/api/v1/auth/verify', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setIsAuthenticated(true);
                    setCustomerData(res.data.customer);
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
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-bold">Loading Customer Portal...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
            {/* Customer Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-6">
                        <BackButton to="/" label="Home" variant="dark" />
                        <div className="flex-1 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">Welcome, {customerData?.name || 'Customer'}</h1>
                                <p className="text-slate-600 font-bold">Your personal internet service dashboard</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 text-xs font-black rounded-full">
                                    CUSTOMER
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
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Customer Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="premium-card bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Current Plan</p>
                                <h3 className="text-2xl font-black text-slate-900">{customerData?.currentPlan || 'Monthly Pro'}</h3>
                            </div>
                            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Account Balance</p>
                                <h3 className="text-2xl font-black text-slate-900">KES {customerData?.balance?.toLocaleString() || '2,500'}</h3>
                            </div>
                            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Data Usage</p>
                                <h3 className="text-2xl font-black text-slate-900">{customerData?.dataUsed || 45}%</h3>
                                <p className="text-xs text-slate-500 mt-1">of {customerData?.dataLimit || 100}GB</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-sky-50 text-sky-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Plan Expires</p>
                                <h3 className="text-2xl font-black text-slate-900">{customerData?.expires || '12 Days'}</h3>
                            </div>
                            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Usage Progress */}
                <div className="premium-card bg-white">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-black text-slate-900">Data Usage Progress</h2>
                        <p className="text-slate-600 font-bold mt-1">Monitor your data consumption</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm font-bold">
                                <span>Data Used: {customerData?.dataUsed || 45}GB</span>
                                <span>Limit: {customerData?.dataLimit || 100}GB</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(customerData?.dataUsed || 45) / (customerData?.dataLimit || 100) * 100}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-4 rounded-full ${customerData?.dataUsed > 80 ? 'bg-rose-500' : customerData?.dataUsed > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                ></motion.div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Low usage</span>
                                <span>High usage</span>
                                <span>Limit reached</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Tabs */}
                <div className="premium-card bg-white">
                    <div className="border-b border-slate-100">
                        <div className="flex space-x-8 px-6">
                            {['dashboard', 'billing', 'activity', 'support'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-4 px-2 font-black text-sm uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab
                                        ? 'border-sky-500 text-sky-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900">Quick Actions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button className="btn-primary py-4 text-sm font-black uppercase tracking-widest">
                                        Top Up Data
                                    </button>
                                    <button className="btn-secondary py-4 text-sm font-black uppercase tracking-widest">
                                        Upgrade Plan
                                    </button>
                                    <button className="btn-ghost py-4 text-sm font-black uppercase tracking-widest">
                                        View Usage
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900">Billing History</h3>
                                <div className="space-y-4">
                                    {customerData?.recentActivity?.map((activity: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                            <div>
                                                <p className="font-bold text-slate-900">{activity.action}</p>
                                                <p className="text-sm text-slate-500">{activity.date}</p>
                                            </div>
                                            <p className={`font-black ${activity.amount.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {activity.amount}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900">Recent Activity</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="font-bold text-slate-900">Connected to WiFi Network</p>
                                        <p className="text-sm text-slate-500">Today at 10:30 AM</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="font-bold text-slate-900">Data Top-up Successful</p>
                                        <p className="text-sm text-slate-500">Yesterday at 3:15 PM</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <p className="font-bold text-slate-900">Plan Renewal Scheduled</p>
                                        <p className="text-sm text-slate-500">In 2 days</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'support' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900">Customer Support</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 rounded-lg">
                                        <h4 className="font-black text-slate-900 mb-2">Live Chat</h4>
                                        <p className="text-sm text-slate-600 mb-4">Connect with our support team instantly</p>
                                        <button className="btn-primary py-2 px-4 text-sm">Start Chat</button>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-lg">
                                        <h4 className="font-black text-slate-900 mb-2">Help Center</h4>
                                        <p className="text-sm text-slate-600 mb-4">Find answers to common questions</p>
                                        <button className="btn-secondary py-2 px-4 text-sm">Visit Help Center</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerPortal;
