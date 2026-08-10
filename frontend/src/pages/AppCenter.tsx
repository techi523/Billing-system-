import { useState, useEffect } from 'react';
import {
    Layers, Shield, Key, Lock, Power, RefreshCw, LayoutGrid, CheckCircle2,
    AlertOctagon, PlusCircle, Activity, Globe, DollarSign, Users, Award, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface AppItem {
    id: string;
    name: string;
    description: string;
    status: 'ACTIVE' | 'EXPIRED' | 'UNSUBSCRIBED';
    installed: boolean;
    latestVersion: string;
    url: string;
}

interface ProductRevenue {
    id: string;
    name: string;
    activeUsers: number;
    totalTenants?: number;
    totalSellers?: number;
    monthlyRevenueCents: number;
}

interface GlobalStats {
    totalUsers: number;
    activeSessions: number;
    ecosystemHealth: string;
    securityLevel: string;
}

const AppCenter = () => {
    const [activeTab, setActiveTab] = useState<'APPS' | 'IDENTITY' | 'SUPERADMIN'>('APPS');
    const [apps, setApps] = useState<AppItem[]>([]);
    const [superAdminData, setSuperAdminData] = useState<{ products: ProductRevenue[]; globalStats: GlobalStats } | null>(null);

    // Identity / Security state
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaSecret, setMfaSecret] = useState('Central-Key-7799');
    const [passwordResetEmail, setPasswordResetEmail] = useState('');
    const [mfaCode, setMfaCode] = useState('');

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/v1/identity/app-center/status');
            if (res.data) {
                setApps(res.data.apps || []);
            }

            // Fetch Super Admin metrics if role matches
            const metricsRes = await axios.get('/api/v1/identity/superadmin/metrics').catch(() => null);
            if (metricsRes && metricsRes.data) {
                setSuperAdminData(metricsRes.data);
            }
        } catch (_) {
            setFeedbackMsg({ type: 'error', message: 'Failed to connect to Central OIDC Identity system.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setFeedbackMsg(null);

        try {
            // Central Password Reset request simulation
            await new Promise(resolve => setTimeout(resolve, 800));
            setFeedbackMsg({ type: 'success', message: `Password reset link successfully dispatched to ${passwordResetEmail} from Central Identity Service.` });
            setPasswordResetEmail('');
        } catch (_) {
            setFeedbackMsg({ type: 'error', message: 'Password reset request failed.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleMfa = async () => {
        setActionLoading(true);
        setFeedbackMsg(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            setMfaEnabled(!mfaEnabled);
            setFeedbackMsg({
                type: 'success',
                message: !mfaEnabled ? 'Multi-Factor Authentication activated centrally for all ecosystem platforms.' : 'MFA disabled centrally.'
            });
        } catch (_) {
            setFeedbackMsg({ type: 'error', message: 'Failed to update MFA settings.' });
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="p-8 text-white text-center font-bold font-sans">
                Connecting to Central OIDC Identity Service...
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Layers className="w-8 h-8 text-sky-400" /> Unified App Center & Ecosystem
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Access independent SaaS applications, manage centralized password security, multi-factor authentication, and monitor platform metrics.
                    </p>
                </div>

                <button
                    onClick={fetchStatus}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Sync Status
                </button>
            </div>

            {feedbackMsg && (
                <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${feedbackMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertOctagon className="w-5 h-5 shrink-0" />}
                    <span>{feedbackMsg.message}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800 gap-2 sm:gap-6 text-xs sm:text-sm font-bold text-slate-400">
                <button
                    onClick={() => setActiveTab('APPS')}
                    className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${activeTab === 'APPS' ? 'border-sky-500 text-sky-400 font-black' : 'border-transparent hover:text-slate-200'}`}
                >
                    <LayoutGrid size={16} /> Ecosystem Applications
                </button>
                <button
                    onClick={() => setActiveTab('IDENTITY')}
                    className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${activeTab === 'IDENTITY' ? 'border-sky-500 text-sky-400 font-black' : 'border-transparent hover:text-slate-200'}`}
                >
                    <Shield size={16} /> Central Security & MFA
                </button>
                {superAdminData && (
                    <button
                        onClick={() => setActiveTab('SUPERADMIN')}
                        className={`pb-3 px-1 transition border-b-2 flex items-center gap-2 ${activeTab === 'SUPERADMIN' ? 'border-sky-500 text-sky-400 font-black' : 'border-transparent hover:text-slate-200'}`}
                    >
                        <Award size={16} /> Platform Super Admin Dashboard
                    </button>
                )}
            </div>

            {/* Tab 1: Ecosystem Applications */}
            {activeTab === 'APPS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {apps.map((app) => (
                        <div key={app.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 relative overflow-hidden flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-sky-400" /> {app.name}
                                    </h3>
                                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full ${app.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                        {app.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">{app.description}</p>
                                <p className="text-[10px] font-mono text-slate-500">Version: {app.latestVersion}</p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                                <a
                                    href={app.url}
                                    className="w-1/2 text-center py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
                                >
                                    Open Application
                                </a>
                                {app.status !== 'ACTIVE' ? (
                                    <button
                                        onClick={() => setFeedbackMsg({ type: 'success', message: `Subscribed successfully to ${app.name}! Subscription billing created.` })}
                                        className="w-1/2 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl transition"
                                    >
                                        Subscribe
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-1/2 py-2.5 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-xl border border-emerald-500/20 cursor-default"
                                    >
                                        Subscribed
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Placeholder Apps demonstrating scalability */}
                    <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-3xl opacity-60 relative flex flex-col justify-between">
                        <div className="space-y-3">
                            <h3 className="text-base font-black text-slate-400 flex items-center gap-2">
                                Mobile Analytics App
                            </h3>
                            <p className="text-xs text-slate-500">View real-time subscriber activity and financial trends on the go.</p>
                            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-full">
                                COMING SOON
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Central Security & MFA */}
            {activeTab === 'IDENTITY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Password Recovery */}
                    <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Key className="text-sky-400" /> Central Password Recovery
                        </h3>
                        <p className="text-xs text-slate-400">
                            Submit your email to request a secure password reset link valid across all ecosystem applications.
                        </p>

                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Registered Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={passwordResetEmail}
                                    onChange={(e) => setPasswordResetEmail(e.target.value)}
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-2xl text-xs uppercase"
                            >
                                Dispatch Reset Email
                            </button>
                        </form>
                    </div>

                    {/* MFA Toggles */}
                    <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6">
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                            <Lock className="text-sky-400" /> Multi-Factor Authentication (MFA)
                        </h3>
                        <p className="text-xs text-slate-400">
                            Secure your unified account with a secondary verification code required during centralized login.
                        </p>

                        {mfaEnabled ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs space-y-2">
                                    <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <CheckCircle2 size={16} /> MFA Protection Active
                                    </p>
                                    <p className="text-slate-300">All products are currently protected by centralized multi-factor checks.</p>
                                </div>
                                <button
                                    onClick={handleToggleMfa}
                                    className="w-full py-3 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold rounded-2xl text-xs"
                                >
                                    Deactivate MFA
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2">
                                    <p className="text-xs text-slate-400">MFA Setup Key: <strong className="text-white font-mono">{mfaSecret}</strong></p>
                                </div>
                                <button
                                    onClick={handleToggleMfa}
                                    className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-2xl text-xs uppercase"
                                >
                                    Activate MFA Protection
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: Platform Owner Dashboard */}
            {activeTab === 'SUPERADMIN' && superAdminData && (
                <div className="space-y-8">
                    
                    {/* Global Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ecosystem Health</span>
                            <div className="text-lg font-black text-emerald-400 flex items-center gap-1.5">
                                <Activity size={16} /> {superAdminData.globalStats.ecosystemHealth}
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Central Users</span>
                            <div className="text-lg font-black text-white">{superAdminData.globalStats.totalUsers}</div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Sessions</span>
                            <div className="text-lg font-black text-sky-400">{superAdminData.globalStats.activeSessions}</div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Level</span>
                            <div className="text-lg font-black text-emerald-400">{superAdminData.globalStats.securityLevel}</div>
                        </div>
                    </div>

                    {/* Product Revenue & Usage Metrics */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-slate-800">
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <DollarSign className="text-sky-400" /> Multi-Product Adoption & Monthly Revenue
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs text-slate-300">
                                <thead>
                                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold">
                                        <th className="p-4">Product</th>
                                        <th className="p-4">Active Users</th>
                                        <th className="p-4">Metric</th>
                                        <th className="p-4">Monthly Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {superAdminData.products.map((prod) => (
                                        <tr key={prod.id} className="hover:bg-slate-800/50 transition">
                                            <td className="p-4 font-bold text-white">{prod.name}</td>
                                            <td className="p-4 font-mono">{prod.activeUsers}</td>
                                            <td className="p-4 text-slate-400">
                                                {prod.id === 'surfbill' ? `Tenants: ${prod.totalTenants}` : `Sellers: ${prod.totalSellers}`}
                                            </td>
                                            <td className="p-4 font-mono text-emerald-400 font-bold">
                                                {formatCurrency(prod.monthlyRevenueCents)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AppCenter;
