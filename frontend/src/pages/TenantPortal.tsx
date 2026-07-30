import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Users, Wifi, Router, DollarSign,
    Activity, CheckCircle, XCircle, Clock, MessageSquare, Wallet,
    ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Zap, BarChart3,
    ShieldCheck, Globe, AlertTriangle, Package, FileText, Settings
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DashboardStats {
    tenantName: string;
    tenantColor?: string;
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    revenueYear: number;
    totalSubscribers: number;
    activeSubscribers: number;
    expiredSubscribers: number;
    onlineUsers: number;
    offlineUsers: number;
    totalRouters: number;
    connectedRouters: number;
    disconnectedRouters: number;
    successPayments: number;
    failedPayments: number;
    pendingPayments: number;
    activeCampaigns: number;
    pendingWithdrawals: number;
    networkHealth: number;
}

interface RevenuePoint { date: string; total: number; }
interface SubGrowthPoint { date: string; count: number; }

// ─── FORMATTERS ──────────────────────────────────────────────────────────────

const fmt = (n: number) => {
    const k = n / 100; // cents → KES
    if (k >= 1_000_000) return `KES ${(k / 1_000_000).toFixed(1)}M`;
    if (k >= 1_000) return `KES ${(k / 1_000).toFixed(1)}K`;
    return `KES ${k.toFixed(0)}`;
};

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

// ─── KPI CARD ────────────────────────────────────────────────────────────────

interface KPICardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    color: string; // tailwind bg class
    trend?: 'up' | 'down' | 'neutral';
    trendVal?: string;
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, icon, color, trend, trendVal, onClick }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClick}
        className={`bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
    >
        <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            {trend && trendVal && (
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : trend === 'down' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                    {trendVal}
                </span>
            )}
        </div>
        <div className="text-2xl font-black text-[var(--text-primary)] leading-tight">{value}</div>
        <div className="text-xs font-semibold text-[var(--text-muted)] mt-1 uppercase tracking-wide">{label}</div>
        {sub && <div className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</div>}
    </motion.div>
);

// ─── QUICK ACTION BUTTON ─────────────────────────────────────────────────────

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    to: string;
    color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, to, color }) => {
    const navigate = useNavigate();
    return (
        <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(to)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:shadow-md transition-all group`}
        >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <span className="text-xs font-bold text-[var(--text-secondary)] text-center leading-tight">{label}</span>
        </motion.button>
    );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const TenantPortal: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [revTrend, setRevTrend] = useState<RevenuePoint[]>([]);
    const [subGrowth, setSubGrowth] = useState<SubGrowthPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [summaryRes, trendRes, growthRes] = await Promise.allSettled([
                axios.get<DashboardStats>('/api/v1/admin/dashboard-summary'),
                axios.get<RevenuePoint[]>('/api/v1/admin/analytics/revenue-trend'),
                axios.get<SubGrowthPoint[]>('/api/v1/admin/analytics/subscriber-growth'),
            ]);

            if (summaryRes.status === 'fulfilled') setStats(summaryRes.value.data);
            if (trendRes.status === 'fulfilled') setRevTrend(trendRes.value.data || []);
            if (growthRes.status === 'fulfilled') setSubGrowth(growthRes.value.data || []);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('[Dashboard] Load failed:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(() => load(true), 60_000);
        return () => clearInterval(interval);
    }, [load]);

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">Loading Dashboard...</p>
            </div>
        </div>
    );

    const s = stats!;
    const netHealthColor = s.networkHealth >= 80 ? 'text-emerald-500' : s.networkHealth >= 50 ? 'text-amber-500' : 'text-rose-500';
    const paymentSuccessRate = s.successPayments + s.failedPayments > 0
        ? ((s.successPayments / (s.successPayments + s.failedPayments)) * 100).toFixed(1)
        : '100';

    // Pie chart data
    const subPieData = [
        { name: 'Active', value: s.activeSubscribers, color: '#10b981' },
        { name: 'Expired', value: s.expiredSubscribers, color: '#ef4444' },
    ];
    const routerPieData = [
        { name: 'Online', value: s.connectedRouters, color: '#38bdf8' },
        { name: 'Offline', value: s.disconnectedRouters, color: '#64748b' },
    ];

    return (
        <div className="space-y-6 pb-8">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">
                        {s.tenantName || 'Dashboard'}
                        <span className="ml-2 text-sky-500">Overview</span>
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Network health badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm font-bold ${netHealthColor}`}>
                        <Activity className="w-4 h-4" />
                        Network {s.networkHealth}%
                    </div>
                    <button
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Revenue Section ── */}
            <div>
                <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" /> Revenue
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard label="Today" value={fmt(s.revenueToday)} icon={<DollarSign className="w-5 h-5 text-emerald-600" />} color="bg-emerald-500/10" trend="up" trendVal="Live" />
                    <KPICard label="This Week" value={fmt(s.revenueWeek)} icon={<TrendingUp className="w-5 h-5 text-sky-600" />} color="bg-sky-500/10" />
                    <KPICard label="This Month" value={fmt(s.revenueMonth)} icon={<BarChart3 className="w-5 h-5 text-violet-600" />} color="bg-violet-500/10" onClick={() => navigate('/tenant/analytics')} />
                    <KPICard label="This Year" value={fmt(s.revenueYear)} icon={<TrendingUp className="w-5 h-5 text-amber-600" />} color="bg-amber-500/10" />
                </div>
            </div>

            {/* ── Revenue Chart ── */}
            {revTrend.length > 0 && (
                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-sm)]">
                    <h3 className="text-sm font-black text-[var(--text-primary)] mb-4">Revenue Trend (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={revTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <YAxis tickFormatter={v => `KES ${(v / 100).toFixed(0)}`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={70} />
                            <Tooltip formatter={(v: any) => [`KES ${((Number(v) || 0) / 100).toFixed(2)}`, 'Revenue']} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={2} fill="url(#revGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Subscribers + Routers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Subscribers */}
                <div>
                    <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Subscribers
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <KPICard label="Total" value={fmtNum(s.totalSubscribers)} icon={<Users className="w-5 h-5 text-sky-600" />} color="bg-sky-500/10" onClick={() => navigate('/tenant')} />
                        <KPICard label="Active" value={fmtNum(s.activeSubscribers)} icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} color="bg-emerald-500/10" trend="up" trendVal={`${s.totalSubscribers > 0 ? Math.round((s.activeSubscribers / s.totalSubscribers) * 100) : 0}%`} />
                        <KPICard label="Online Now" value={fmtNum(s.onlineUsers)} icon={<Wifi className="w-5 h-5 text-violet-600" />} color="bg-violet-500/10" onClick={() => navigate('/tenant/sessions')} />
                        <KPICard label="Expired" value={fmtNum(s.expiredSubscribers)} icon={<XCircle className="w-5 h-5 text-rose-600" />} color="bg-rose-500/10" trend={s.expiredSubscribers > 0 ? 'down' : 'neutral'} />
                    </div>

                    {/* Mini pie */}
                    {(s.activeSubscribers + s.expiredSubscribers) > 0 && (
                        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 flex items-center gap-4">
                            <ResponsiveContainer width={80} height={80}>
                                <PieChart>
                                    <Pie data={subPieData} cx="50%" cy="50%" innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                                        {subPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5">
                                {subPieData.map(d => (
                                    <div key={d.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                        <span className="text-[var(--text-secondary)] font-semibold">{d.name}: <strong className="text-[var(--text-primary)]">{d.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Routers */}
                <div>
                    <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Router className="w-3.5 h-3.5" /> Network
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <KPICard label="Total Routers" value={s.totalRouters} icon={<Router className="w-5 h-5 text-slate-600" />} color="bg-slate-500/10" onClick={() => navigate('/tenant/router-management')} />
                        <KPICard label="Online" value={s.connectedRouters} icon={<Wifi className="w-5 h-5 text-emerald-600" />} color="bg-emerald-500/10" trend="up" trendVal={`${s.totalRouters > 0 ? Math.round((s.connectedRouters / s.totalRouters) * 100) : 100}%`} />
                        <KPICard label="Offline" value={s.disconnectedRouters} icon={<AlertTriangle className="w-5 h-5 text-rose-600" />} color="bg-rose-500/10" trend={s.disconnectedRouters > 0 ? 'down' : 'neutral'} />
                        <KPICard
                            label="Health Score"
                            value={`${s.networkHealth}%`}
                            icon={<ShieldCheck className="w-5 h-5 text-sky-600" />}
                            color="bg-sky-500/10"
                            onClick={() => navigate('/tenant/network-monitoring')}
                        />
                    </div>

                    {/* Mini pie */}
                    {s.totalRouters > 0 && (
                        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 flex items-center gap-4">
                            <ResponsiveContainer width={80} height={80}>
                                <PieChart>
                                    <Pie data={routerPieData} cx="50%" cy="50%" innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                                        {routerPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5">
                                {routerPieData.map(d => (
                                    <div key={d.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                        <span className="text-[var(--text-secondary)] font-semibold">{d.name}: <strong className="text-[var(--text-primary)]">{d.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Finance + SMS Row ── */}
            <div>
                <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5" /> Finance & Payments
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KPICard label="Successful" value={fmtNum(s.successPayments)} icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} color="bg-emerald-500/10" onClick={() => navigate('/tenant/reports')} />
                    <KPICard label="Failed" value={fmtNum(s.failedPayments)} icon={<XCircle className="w-5 h-5 text-rose-600" />} color="bg-rose-500/10" trend={s.failedPayments > 0 ? 'down' : 'neutral'} trendVal={s.failedPayments > 0 ? `${paymentSuccessRate}%` : undefined} />
                    <KPICard label="Pending" value={fmtNum(s.pendingPayments)} icon={<Clock className="w-5 h-5 text-amber-600" />} color="bg-amber-500/10" />
                    <KPICard label="Withdrawals" value={fmtNum(s.pendingWithdrawals)} icon={<ArrowUpRight className="w-5 h-5 text-violet-600" />} color="bg-violet-500/10" onClick={() => navigate('/tenant/wallet')} />
                    <KPICard label="SMS Campaigns" value={fmtNum(s.activeCampaigns)} icon={<MessageSquare className="w-5 h-5 text-sky-600" />} color="bg-sky-500/10" onClick={() => navigate('/tenant/communication')} />
                    <KPICard label="Success Rate" value={`${paymentSuccessRate}%`} icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />} color="bg-emerald-500/10" trend="up" />
                </div>
            </div>

            {/* ── Subscriber Growth Chart ── */}
            {subGrowth.length > 0 && (
                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-sm)]">
                    <h3 className="text-sm font-black text-[var(--text-primary)] mb-4">Subscriber Growth (Last 30 Days)</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={subGrowth} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={30} />
                            <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', fontSize: '12px' }} />
                            <Bar dataKey="count" name="New Subscribers" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Quick Actions ── */}
            <div>
                <h2 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Quick Actions
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                    <QuickAction icon={<Plus className="w-5 h-5 text-emerald-600" />} label="Add Package" to="/tenant/packages" color="bg-emerald-500/10" />
                    <QuickAction icon={<Users className="w-5 h-5 text-sky-600" />} label="Add Subscriber" to="/tenant" color="bg-sky-500/10" />
                    <QuickAction icon={<Router className="w-5 h-5 text-violet-600" />} label="Add Router" to="/tenant/router-management" color="bg-violet-500/10" />
                    <QuickAction icon={<Wifi className="w-5 h-5 text-amber-600" />} label="MikroTik Setup" to="/tenant/mikrotik" color="bg-amber-500/10" />
                    <QuickAction icon={<BarChart3 className="w-5 h-5 text-pink-600" />} label="Analytics" to="/tenant/analytics" color="bg-pink-500/10" />
                    <QuickAction icon={<Activity className="w-5 h-5 text-teal-600" />} label="Monitoring" to="/tenant/network-monitoring" color="bg-teal-500/10" />
                    <QuickAction icon={<FileText className="w-5 h-5 text-blue-600" />} label="Reports" to="/tenant/reports" color="bg-blue-500/10" />
                    <QuickAction icon={<MessageSquare className="w-5 h-5 text-indigo-600" />} label="Send SMS" to="/tenant/communication" color="bg-indigo-500/10" />
                    <QuickAction icon={<Wallet className="w-5 h-5 text-rose-600" />} label="Wallet" to="/tenant/wallet" color="bg-rose-500/10" />
                    <QuickAction icon={<Settings className="w-5 h-5 text-slate-600" />} label="Settings" to="/tenant/profile" color="bg-slate-500/10" />
                </div>
            </div>

        </div>
    );
};

export default TenantPortal;
