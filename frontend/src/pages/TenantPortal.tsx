import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SubscriberTable from '../components/Modern/SubscriberTable';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/Common/BackButton';
import SupportFooter from '../components/Common/SupportFooter';
import SupportSection from '../components/Common/SupportSection';
import { Shield, Zap, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/Common/ThemeToggle';

const TenantPortal = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [tenantData, setTenantData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
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
                if (err.response?.status === 401) {
                    // Session expired or invalid
                    logout();
                    return;
                }
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
                <div className="text-center max-w-md p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Workspace Access Issue</h2>
                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                        {error === 'No tenant assigned to your account'
                            ? "You don't have an active workspace yet. Let's get you set up."
                            : error}
                    </p>

                    <div className="space-y-3">
                        {(!user?.tenantId || error === 'No tenant assigned to your account') && (
                            <button
                                onClick={() => navigate('/tenant/setup')}
                                className="w-full px-6 py-4 bg-sky-500 text-white font-black rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 flex items-center justify-center gap-2 group"
                            >
                                Setup Your Workspace <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        {user?.role === 'SUPER_ADMIN' && (
                            <button
                                onClick={() => navigate('/superadmin')}
                                className="w-full px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all"
                            >
                                Go to Command Center
                            </button>
                        )}

                        <button
                            onClick={logout}
                            className="w-full px-6 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all"
                        >
                            Logout & Switch Account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-300">
            {/* Tenant Header */}
            <div className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-6">
                        <BackButton to="/" label="Home" variant="dark" />
                        <div className="flex-1 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-[var(--text-primary)]">{tenantData?.tenantName || 'Tenant'} Portal</h1>
                                <p className="text-[var(--text-secondary)] font-bold">Subscriber Management & Analytics</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <ThemeToggle />
                                <span className="px-3 py-1 bg-sky-500/20 text-sky-600 text-xs font-black rounded-full text-center">
                                    {user?.role}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate('/tenant')}
                                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${window.location.pathname === '/tenant' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => navigate('/tenant/packages')}
                                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${window.location.pathname === '/tenant/packages' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Packages
                                    </button>
                                    <button
                                        onClick={() => navigate('/tenant/analytics')}
                                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${window.location.pathname === '/tenant/analytics' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Analytics
                                    </button>
                                    <button
                                        onClick={() => navigate('/tenant/mikrotik')}
                                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${window.location.pathname === '/tenant/mikrotik' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Routers
                                    </button>
                                    <button
                                        onClick={() => navigate('/tenant/campaigns')}
                                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${window.location.pathname === '/tenant/campaigns' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Campaigns
                                    </button>
                                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
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
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Welcome Message for New Tenants - FIXED: Packages no longer auto-created */}
                {tenantData?.isNewTenant && (
                    <div className="premium-card bg-emerald-50 border border-emerald-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                                    <Zap className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-slate-900 mb-2">Welcome to Your New Tenant Portal!</h3>
                                    <p className="text-slate-600 font-bold mb-3">
                                        Your account has been initialized. You are now in **Setup Mode**.
                                    </p>
                                    <ul className="text-slate-600 font-bold space-y-1 mb-4">
                                        <li className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                            Wallet created and ready for payments
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                                            <span className="text-rose-600">Manual Package creation required</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                                            <span className="text-rose-600">Router configuration required</span>
                                        </li>
                                    </ul>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate('/tenant/packages')}
                                            className="px-4 py-2 bg-sky-500 text-white font-bold rounded-lg hover:bg-sky-600 transition-colors text-sm"
                                        >
                                            Create Packages
                                        </button>
                                        <button
                                            onClick={() => navigate('/tenant/mikrotik')}
                                            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors text-sm"
                                        >
                                            Setup Router
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                <Shield className="w-6 h-6 text-emerald-600" />
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

                {/* New Feature Shortcuts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        onClick={() => navigate('/tenant/analytics')}
                        className="premium-card bg-slate-900 border-none cursor-pointer group overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center gap-6 p-2 relative z-10 text-white">
                            <div className="p-4 bg-sky-500 rounded-2xl">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-1">Real-time Analytics</h3>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Live Revenue Stream</p>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/tenant/packages')}
                        className="premium-card bg-sky-500 border-none cursor-pointer group overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center gap-6 p-2 relative z-10 text-white">
                            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-1">Billing Packages</h3>
                                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Pricing & Speed Sync</p>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/tenant/mikrotik')}
                        className="premium-card bg-white border-2 border-slate-900 cursor-pointer group relative"
                    >
                        <div className="flex items-center gap-6 p-2 text-slate-900">
                            <div className="p-4 bg-slate-900 text-white rounded-2xl">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-1 text-slate-900">MikroTik Center</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Router Management</p>
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

                {/* Scaling & Support CTA */}
                <SupportSection title="Technical Scaling & Support" />
            </div>

            <div className="mt-12">
                <SupportFooter />
            </div>
        </div>
    );
};

export default TenantPortal;
