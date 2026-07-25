import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SubscriberTable from '../components/Modern/SubscriberTable';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Shield, Zap, ArrowRight, ArrowUpRight, ArrowDownRight,
    Users, Wifi, Wallet, MessageSquare, Package, Send,
    CreditCard, TrendingUp, Activity, Clock, DollarSign,
    BarChart3, Globe, Mail, Plus, RefreshCw
} from 'lucide-react';

interface TenantDashboardData {
    tenantName: string;
    tenantLogo?: string;
    tenantColor?: string;
    activeUsers: number;
    subscriberCount: number;
    pendingPayments: number;
    walletBalance: number;
    settledBalance: number;
    plan: string;
    isNewTenant: boolean;
}

const TenantPortal = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [tenantData, setTenantData] = useState<TenantDashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [smsBalance, setSmsBalance] = useState(0);

    const fetchDashboardData = useCallback(async () => {
        try {
            setIsLoading(true);
            const initStatusRes = await axios.get<{ isBootstrapped: boolean }>('/api/v1/admin/initialize/status');
            const isBootstrapped = initStatusRes.data.isBootstrapped;
            if (!isBootstrapped) {
                await axios.post('/api/v1/admin/initialize');
            }

            const [statsRes, walletRes, smsRes] = await Promise.all([
                axios.get<{
                    tenantName: string;
                    tenantLogo?: string;
                    tenantColor?: string;
                    activeSessions: number;
                    subscriberCount: number;
                    pendingPayments: number;
                    plan: string;
                }>('/api/v1/admin/dashboard-summary'),
                axios.get<{ balance: number; settledBalance: number }>('/api/v1/wallet/balance'),
                axios.get<{ balance: number }>('/api/v1/sms/balance').catch(() => ({ data: { balance: 0 } })),
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
            setSmsBalance(smsRes.data.balance || 0);
        } catch (err: unknown) {
            console.error('Failed to fetch tenant data', err);
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 401) { logout(); return; }
                if (err.response?.status === 404) { setError('Tenant not found. Please contact support.'); }
                else if (err.response?.status === 403) { setError('Access denied. Please check your permissions.'); }
                else { setError('Failed to load tenant data. Please try again.'); }
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-3" />
                    <p className="text-[var(--text-muted)] font-semibold text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center max-w-md p-8 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-md)]">
                    <div className="w-14 h-14 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-7 h-7 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Workspace Access Issue</h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-6">
                        {error === 'No tenant assigned to your account'
                            ? "You don't have an active workspace yet. Let's get you set up."
                            : error}
                    </p>
                    <div className="space-y-2">
                        {(!user?.tenantId || error === 'No tenant assigned to your account') && (
                            <button onClick={() => navigate('/tenant/setup')} className="btn-primary w-full">
                                Setup Your Workspace <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={logout} className="btn-secondary w-full">
                            Logout & Switch Account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Quick Action Items ─────────────────────────
    const quickActions = [
        { label: 'Create Package', icon: Package, path: '/tenant/packages', color: 'text-sky-500', bg: 'bg-sky-500/10' },
        { label: 'Add Subscriber', icon: Users, path: '/tenant', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Connect Router', icon: Wifi, path: '/tenant/mikrotik', color: 'text-violet-500', bg: 'bg-violet-500/10' },
        { label: 'Send Campaign', icon: Send, path: '/tenant/campaigns', color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Buy SMS', icon: CreditCard, path: '/tenant/communication', color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'View Wallet', icon: Wallet, path: '/tenant/wallet', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-6">
            {/* ─── Welcome & New Tenant Banner ─────────────── */}
            {tenantData?.isNewTenant && (
                <div className="premium-card border-l-4 border-l-emerald-500 !p-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Welcome to Your New Portal!</h3>
                            <p className="text-[var(--text-secondary)] text-xs mb-3">
                                Your workspace is initialized. Complete setup by creating packages and connecting your router.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => navigate('/tenant/packages')} className="btn-primary !py-2 !px-4 !text-xs">
                                    Create Packages
                                </button>
                                <button onClick={() => navigate('/tenant/mikrotik')} className="btn-secondary !py-2 !px-4 !text-xs">
                                    Setup Router
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── KPI Cards Row ──────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Active Users"
                    value={tenantData?.activeUsers || 0}
                    icon={<Users className="w-4 h-4" />}
                    color="sky"
                />
                <KPICard
                    label="Subscribers"
                    value={tenantData?.subscriberCount || 0}
                    icon={<Activity className="w-4 h-4" />}
                    color="emerald"
                />
                <KPICard
                    label="Wallet Balance"
                    value={`KES ${((tenantData?.walletBalance || 0) / 100).toLocaleString()}`}
                    icon={<Wallet className="w-4 h-4" />}
                    color="violet"
                    onClick={() => navigate('/tenant/wallet')}
                />
                <KPICard
                    label="SMS Credits"
                    value={smsBalance}
                    icon={<MessageSquare className="w-4 h-4" />}
                    color="amber"
                    onClick={() => navigate('/tenant/communication')}
                />
                <KPICard
                    label="Pending Payments"
                    value={tenantData?.pendingPayments || 0}
                    icon={<Clock className="w-4 h-4" />}
                    color="rose"
                />
            </div>

            {/* ─── Quick Actions Grid ─────────────────────────── */}
            <div className="premium-card !p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-all group text-center"
                        >
                            <div className={`p-2.5 rounded-lg ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                                <action.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-tight">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Feature Navigation Cards ───────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FeatureCard
                    title="Real-time Analytics"
                    subtitle="Revenue & Traffic"
                    icon={<BarChart3 className="w-5 h-5" />}
                    onClick={() => navigate('/tenant/analytics')}
                    variant="dark"
                />
                <FeatureCard
                    title="Billing Packages"
                    subtitle="Plans & Pricing"
                    icon={<Zap className="w-5 h-5" />}
                    onClick={() => navigate('/tenant/packages')}
                    variant="primary"
                />
                <FeatureCard
                    title="MikroTik Center"
                    subtitle="Router Management"
                    icon={<Wifi className="w-5 h-5" />}
                    onClick={() => navigate('/tenant/mikrotik')}
                    variant="outlined"
                />
                <FeatureCard
                    title="SMS & Campaigns"
                    subtitle="Communication Hub"
                    icon={<MessageSquare className="w-5 h-5" />}
                    onClick={() => navigate('/tenant/communication')}
                    variant="gradient"
                />
            </div>

            {/* ─── Subscriber Management Table ────────────────── */}
            <div className="premium-card !p-0 overflow-hidden">
                <div className="p-5 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">Subscriber Management</h2>
                            <p className="text-[var(--text-secondary)] text-xs mt-0.5">Live session monitoring and user control</p>
                        </div>
                        <button onClick={fetchDashboardData} className="btn-ghost !py-2 !px-3 !text-xs">
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </button>
                    </div>
                </div>
                <SubscriberTable />
            </div>
        </div>
    );
};

// ─── Sub-components ─────────────────────────────────────────────

interface KPICardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, color, onClick }) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
        sky: { bg: 'bg-sky-500/10', text: 'text-sky-500' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
        violet: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
    };
    const c = colorMap[color] || colorMap.sky;

    return (
        <div
            onClick={onClick}
            className={`stat-card ${onClick ? 'cursor-pointer hover:border-[var(--border-strong)]' : ''}`}
        >
            <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
                <div className={`p-1.5 rounded-lg ${c.bg} ${c.text}`}>
                    {icon}
                </div>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    );
};

interface FeatureCardProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant: 'dark' | 'primary' | 'outlined' | 'gradient';
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, subtitle, icon, onClick, variant }) => {
    const styles: Record<string, string> = {
        dark: 'bg-slate-900 text-white border-transparent dark:bg-slate-800',
        primary: 'bg-sky-500 text-white border-transparent',
        outlined: 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-2 border-[var(--border-strong)]',
        gradient: 'bg-gradient-to-br from-sky-600 to-indigo-700 text-white border-transparent',
    };

    const iconBg: Record<string, string> = {
        dark: 'bg-sky-500',
        primary: 'bg-white/20',
        outlined: 'bg-slate-900 text-white dark:bg-sky-500',
        gradient: 'bg-white/20',
    };

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer group overflow-hidden relative transition-all duration-300 hover:shadow-lg text-left ${styles[variant]}`}
        >
            <div className={`p-3 rounded-xl ${iconBg[variant]} flex-shrink-0`}>
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-bold mb-0.5">{title}</h3>
                <p className={`text-[10px] font-semibold uppercase tracking-widest ${variant === 'outlined' ? 'text-[var(--text-muted)]' : 'opacity-70'}`}>
                    {subtitle}
                </p>
            </div>
        </button>
    );
};

export default TenantPortal;
