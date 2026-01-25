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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.tenantId) {
                setError('No tenant assigned to your account');
                setIsLoading(false);
                return;
            }

            try {
                // Check if tenant needs initialization
                const initStatusRes = await axios.get('/api/v1/admin/initialize/status');
                const isBootstrapped = initStatusRes.data.isBootstrapped;

                // If not bootstrapped, initialize the tenant
                if (!isBootstrapped) {
                    await axios.post('/api/v1/admin/initialize');
                }

                const [statsRes, walletRes] = await Promise.all([
                    axios.get('/api/v1/admin/dashboard-summary'),
                    axios.get('/api/v1/wallet/balance')
                ]);

                setTenantData({
                    tenantName: statsRes.data.tenantName || 'Your Tenant',
                    tenantLogo: statsRes.data.tenantLogo,
                    tenantColor: statsRes.data.tenantColor,
                    activeUsers: statsRes.data.activeSessions || 0,
                    subscriberCount: statsRes.data.subscriberCount || 0,
                    pendingPayments: statsRes.data.pendingPayments || 0,
                    walletBalance: walletRes.data.balance || 0,
                    settledBalance: walletRes.data.settledBalance || 0,
                    plan: statsRes.data.plan || 'Standard',
                    isNewTenant: !isBootstrapped
                });
            } catch (err: any) {
                console.error('Failed to fetch tenant data', err);
                if (err.response?.status === 404) {
                    setError('Tenant not found. Please contact support.');
                } else if (err.response?.status === 403) {
                    setError('Access denied. Please check your permissions.');
                } else {
                    setError('Failed to load tenant data. Please try again.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user?.tenantId]);

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

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Portal Unavailable</h2>
                    <p className="text-slate-600 font-bold mb-6">{error}</p>
                    <div className="space-y-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={logout}
                            className="w-full px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
            {/* Tenant Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">{tenantData?.tenantName || 'Tenant'} Portal</h1>
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

                {/* Welcome Message for New Tenants */}
                {tenantData?.isNewTenant && (
                    <div className="premium-card bg-emerald-50 border border-emerald-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-slate-900 mb-2">Welcome to Your New Tenant Portal!</h3>
                                    <p className="text-slate-600 font-bold mb-3">
                                        Your account has been automatically initialized with:
                                    </p>
                                    <ul className="text-slate-600 font-bold space-y-1 mb-4">
                                        <li className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            Default wallet (balance: KES 0)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            4 default packages (1 Hour, Daily, Weekly, Monthly)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            Ready for your first subscribers
                                        </li>
                                    </ul>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate('/tenant/packages')}
                                            className="px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-colors text-sm"
                                        >
                                            View Packages
                                        </button>
                                        <button
                                            onClick={() => navigate('/tenant/wallet')}
                                            className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                                        >
                                            Manage Wallet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscriber Management */}
                <div className="premium-card bg-white">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-black text-slate-900">Subscriber Management</h2>
                        <p className="text-slate-600 font-bold mt-1">Live session monitoring and user control</p>
                    </div>
                    <SubscriberTable />
                </div>

                {/* Empty State for No Subscribers */}
                {tenantData?.subscriberCount === 0 && (
                    <div className="premium-card bg-white">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">No Subscribers Yet</h3>
                            <p className="text-slate-600 font-bold mb-4">
                                Your subscriber list is currently empty. As customers purchase packages, they'll appear here.
                            </p>
                            <button
                                onClick={() => navigate('/tenant/packages')}
                                className="px-6 py-3 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-colors"
                            >
                                View Available Packages
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TenantPortal;
