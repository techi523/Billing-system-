import React, { useState, useEffect } from 'react';
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    ShieldCheck,
    RefreshCw,
    Filter,
    BarChart3,
    Clock,
    Wifi
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import SupportFooter from '../components/Common/SupportFooter';
import BackButton from '../components/Common/BackButton';

interface RevenueData {
    today: number;
    month: number;
}

interface BandwidthUsage {
    in: number;
    out: number;
}

interface BandwidthData {
    activeSessions: number;
    totalIn: number;
    totalOut: number;
    usageByRouter: Record<string, BandwidthUsage>;
}

interface PerformanceData {
    rate: number;
    failed: number;
}

interface TrafficContext {
    peakHours: string;
    netEfficiency: string;
}

const Analytics: React.FC = () => {
    const [revenue, setRevenue] = useState<RevenueData | null>(null);
    const [bandwidth, setBandwidth] = useState<BandwidthData | null>(null);
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [trafficContext, setTrafficContext] = useState<TrafficContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const [revRes, bandRes, perfRes] = await Promise.all([
                axios.get<RevenueData>('/api/v1/admin/analytics/revenue'),
                axios.get<BandwidthData>('/api/v1/admin/analytics/bandwidth'),
                axios.get<PerformanceData>('/api/v1/admin/analytics/performance')
            ]);
            setRevenue(revRes.data);
            setBandwidth(bandRes.data);
            setPerformance(perfRes.data);

            // Fetch traffic context separately to not block main stats
            axios.get<TrafficContext>('/api/v1/admin/analytics/context')
                .then(res => setTrafficContext(res.data))
                .catch(err => console.error('[Analytics] Failed to fetch traffic context:', err));
        } catch (error: unknown) {
            console.error('[Analytics] Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Pulse every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center transition-colors duration-300">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-12 h-12 text-sky-500 animate-spin" />
                <p className="font-black text-[var(--text-muted)] uppercase tracking-widest text-xs">Streaming Real-time Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--bg-main)] font-sans selection:bg-sky-500 transition-colors duration-300">
            {/* Header */}
            <header className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] sticky top-0 z-40 px-8 py-6 transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <BackButton to="/tenant" variant="dark" />
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Real-time <span className="text-sky-500">Insights</span></h1>
                                <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    LIVE STREAMING
                                </div>
                            </div>
                            <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight">ISP-Grade Analytics & Revenue Monitoring</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] transition-all flex items-center gap-2 group shadow-sm"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            <span className="text-sm font-black uppercase tracking-widest">Refresh</span>
                        </button>
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-10 space-y-10">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                        title="Today's Revenue"
                        value={`KES ${revenue?.today?.toLocaleString()}`}
                        trend="+12.5%"
                        positive={true}
                        icon={<Zap className="w-6 h-6" />}
                        color="sky"
                    />
                    <KPICard
                        title="Monthly Forecast"
                        value={`KES ${revenue?.month?.toLocaleString()}`}
                        trend="+8.2%"
                        positive={true}
                        icon={<BarChart3 className="w-6 h-6" />}
                        color="indigo"
                    />
                    <KPICard
                        title="Active Sessions"
                        value={bandwidth?.activeSessions || 0}
                        trend="Live"
                        positive={true}
                        icon={<Activity className="w-6 h-6" />}
                        color="emerald"
                    />
                    <KPICard
                        title="Success Rate"
                        value={`${(performance?.rate ?? 0).toFixed(1)}%`}
                        trend={(performance?.failed ?? 0) > 0 ? `${performance?.failed} failed` : 'Perfect'}
                        positive={(performance?.rate ?? 0) > 90}
                        icon={<ShieldCheck className="w-6 h-6" />}
                        color="violet"
                    />
                </div>

                {/* Main Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Bandwidth Usage */}
                    <div className="bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-subtle)] p-8 shadow-sm transition-colors duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Bandwidth Consumption</h2>
                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Real-time throughput across routers</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-[10px] font-black uppercase">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {formatBytes(bandwidth?.totalOut || 0)} Out
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                                    <ArrowDownRight className="w-3 h-3" />
                                    {formatBytes(bandwidth?.totalIn || 0)} In
                                </div>
                            </div>
                        </div>

                        {/* Placeholder for actual chart - using simple Bars for routers */}
                        <div className="space-y-6">
                            {bandwidth && Object.entries(bandwidth.usageByRouter).map(([routerId, usage]) => (
                                <div key={routerId} className="space-y-2">
                                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                                        <span>Router: {routerId.split('-')[0]}...</span>
                                        <span>{formatBytes(usage.in + usage.out)} Total</span>
                                    </div>
                                    <div className="h-4 w-full bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden flex">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${bandwidth.totalOut ? Math.min(100, (usage.out / bandwidth.totalOut) * 100) : 0}%` }}
                                            className="h-full bg-sky-500"
                                        />
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${bandwidth.totalIn ? Math.min(100, (usage.in / bandwidth.totalIn) * 100) : 0}%` }}
                                            className="h-full bg-indigo-500"
                                        />
                                    </div>
                                </div>
                            ))}
                            {(!bandwidth || Object.keys(bandwidth.usageByRouter).length === 0) && (
                                <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl">
                                    <p className="text-slate-400 font-bold text-sm">Waiting for active traffic data...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Peak Hours / Traffic Trends Sidebar */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                        <h2 className="text-xl font-black tracking-tight mb-6">Traffic Context</h2>
                        <div className="space-y-6">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight text-white/80">Peak Hours</span>
                                </div>
                                <p className="text-2xl font-black text-white mb-1">{trafficContext?.peakHours || 'Analyzing...'}</p>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-relaxed">System-wide historical peak based on session initiation</p>
                            </div>

                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                        <Wifi className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight text-white/80">Net Efficiency</span>
                                </div>
                                <p className="text-2xl font-black text-white mb-1">{trafficContext?.netEfficiency || 'Calculating...'}</p>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-relaxed">Successful auth requests vs total system handshakes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <div className="mt-12">
                <SupportFooter />
            </div>
        </div>
    );
};

const KPICard: React.FC<{ title: string, value: string | number, trend: string, positive: boolean, icon: React.ReactNode, color: 'sky' | 'indigo' | 'emerald' | 'violet' }> = ({ title, value, trend, positive, icon, color }) => {
    const colorMap: Record<string, string> = {
        sky: 'bg-sky-50 text-sky-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        violet: 'bg-violet-50 text-violet-600'
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-subtle)] shadow-sm transition-colors duration-300"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colorMap[color]}`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${positive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {trend}
                    {trend !== 'Live' && trend !== 'Perfect' && (positive ? <ArrowUpRight className="w-3 h-3" /> : null)}
                </div>
            </div>
            <div>
                <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">{value}</h3>
            </div>
        </motion.div>
    );
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default Analytics;
