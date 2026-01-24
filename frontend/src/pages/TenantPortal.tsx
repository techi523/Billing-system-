import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SubscriberTable from '../components/Modern/SubscriberTable';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const TenantPortal = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [tenantData, setTenantData] = useState<any>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, walletRes] = await Promise.all([
                    axios.get('/api/v1/admin/dashboard-summary'),
                    axios.get('/api/v1/wallet/balance')
                ]);

                setTenantData({
                    activeUsers: statsRes.data.activeSessions,
                    subscriberCount: statsRes.data.subscriberCount,
                    pendingPayments: statsRes.data.pendingPayments,
                    walletBalance: walletRes.data.balance,
                    settledBalance: walletRes.data.settledBalance,
                    plan: statsRes.data.plan || 'Standard'
                });
            } catch (err) {
                console.error('Failed to fetch tenant data', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-bold">Loading Tenant Portal...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
            {/* Tenant Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">{tenantData?.name || 'Tenant'} Portal</h1>
                            <p className="text-slate-600 font-bold">Subscriber Management & Analytics</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-sky-500/20 text-sky-600 text-xs font-black rounded-full">
                                {user?.role}
                            </span>
                            <button
                                onClick={() => navigate('/tenant/wallet')}
                                className="px-4 py-2 bg-sky-100 text-sky-700 font-bold rounded-lg hover:bg-sky-200 transition-colors"
                            >
                                Wallet
                            </button>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Tenant Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="premium-card bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Active Users</p>
                                <h3 className="text-2xl font-black text-slate-900">{tenantData?.activeUsers || 0}</h3>
                            </div>
                            <div className="p-3 rounded-2xl bg-sky-50 text-sky-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card bg-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Current Plan</p>
                                <h3 className="text-2xl font-black text-slate-900">{tenantData?.plan || '---'}</h3>
                            </div>
                            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/tenant/wallet')}
                        className="premium-card bg-white cursor-pointer hover:border-sky-200 transition-all border-l-4 border-sky-500"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">Wallet Balance</p>
                                <h3 className="text-2xl font-black text-slate-900">KES {tenantData?.walletBalance?.toLocaleString() || '0'}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Click to manage & withdraw</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-sky-50 text-sky-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscriber Management */}
                <div className="premium-card bg-white">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-black text-slate-900">Subscriber Management</h2>
                        <p className="text-slate-600 font-bold mt-1">Live session monitoring and user control</p>
                    </div>
                    <SubscriberTable />
                </div>
            </div>
        </div>
    );
};

export default TenantPortal;
