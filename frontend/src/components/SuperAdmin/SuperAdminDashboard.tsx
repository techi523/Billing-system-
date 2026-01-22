import { useState, useEffect } from 'react';
import { Globe, Building2, TrendingUp, CheckCircle2, Clock, Activity } from 'lucide-react';
import axios from 'axios';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [platformFees, setPlatformFees] = useState<any[]>([]);
    const [platformWallet, setPlatformWallet] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, tenantsRes, logsRes, walletsRes, feesRes, pWalletRes] = await Promise.all([
                    axios.get('/api/v1/superadmin/platform-stats'),
                    axios.get('/api/v1/superadmin/tenants'),
                    axios.get('/api/v1/superadmin/audit-logs'),
                    axios.get('/api/v1/superadmin/wallets'),
                    axios.get('/api/v1/superadmin/platform-fees'),
                    axios.get('/api/v1/superadmin/platform-wallet')
                ]);
                setStats(statsRes.data);
                setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
                setAuditLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
                setWallets(walletsRes.data || []);
                setPlatformFees(feesRes.data || []);
                setPlatformWallet(pWalletRes.data);
            } catch (error) {
                console.error('Failed to fetch SuperAdmin data');
            }
        };
        fetchData();
    }, []);

    const toggleTenantStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        await axios.put(`/api/v1/superadmin/tenants/${id}/status`, { status: newStatus });
        setTenants(tenants.map(t => t.id === id ? { ...t, status: newStatus } : t));
    };

    if (!stats) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Hydrating Platform Engine...</p>
        </div>
    );

    return (
    return (
        <div className="space-y-12 animate-fade-in pb-10">
            {/* Hero Section */}
            <div className="relative">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                    Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Command Center</span>
                </h1>
                <p className="text-slate-500 font-medium">Global Infrastructure Oversight</p>
                <div className="absolute top-0 right-0 p-3 glass-panel rounded-2xl flex items-center gap-3">
                    <div className="relative">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute top-0 right-0 opacity-75"></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full relative z-10"></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">System Operational</span>
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Platform Revenue', value: stats.totalRevenue, sub: 'Gross Ledger', icon: TrendingUp, color: 'indigo', delay: 0 },
                    { label: 'Active Tenants', value: stats.activeTenants, sub: `Out of ${stats.totalTenants} Total`, icon: Building2, color: 'sky', delay: 0.1 },
                    { label: 'Global Transactions', value: stats.totalPayments, sub: 'Success Rate: 98%', icon: CheckCircle2, color: 'emerald', delay: 0.2 },
                    { label: 'Regional Hub Load', value: 'Optimal', sub: 'Latency: 12ms', icon: Globe, color: 'orange', delay: 0.3 }
                ].map((s, i) => (
                    <div key={i} className="group relative" style={{ animationDelay: `${s.delay}s` }}>
                        <div className={`absolute inset-0 bg-gradient-to-br from-${s.color}-500/20 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                        <div className="relative bg-white/60 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-xl hover:-translate-y-1 transition-transform duration-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                                    <s.icon size={24} strokeWidth={2} />
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-${s.color}-50 text-${s.color}-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    Live
                                </span>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                                {typeof s.value === 'number' && s.label.includes('Revenue') ? `KES ${s.value.toLocaleString()}` : s.value}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Map / Audit (Replacing Map with Audit for now as verified component) */}
                <div className="lg:col-span-2 glass-panel-dark rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col h-[500px]">
                    {/* Decorative Gradients */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[100px] -ml-20 -mb-20 animate-float-delayed"></div>

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <Activity className="text-sky-400" />
                                Live Network Activity
                            </h3>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Real-time Event Stream</p>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-widest transition-colors">
                            Filter Stream
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 scrollbar-thin scrollbar-thumb-sky-500/20">
                        {auditLogs.map((log, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group cursor-default">
                                <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-300 group-hover:bg-sky-500/20 group-hover:text-sky-300 transition-colors">
                                    <Clock size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                        <span className="text-sky-400 font-bold mr-2">[{log.action}]</span>
                                        {log.details}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-black/30 px-2 py-0.5 rounded">
                                            {log.ipAddress || '192.168.1.1'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(log.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tenant Quick List */}
                <div className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-[2.5rem] p-8 shadow-xl flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Active Tenants</h3>
                        <div className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-black">
                            {tenants.filter(t => t.status === 'ACTIVE').length} ONLINE
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {tenants.map((t) => (
                            <div key={t.id} className="group p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-200">
                                        {t.name.substring(0, 1)}
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${t.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                </div>
                                <h4 className="font-bold text-slate-900 leading-tight mb-1">{t.name}</h4>
                                <p className="text-xs text-slate-400 font-medium mb-4">@{t.subdomain}.surfbill.app</p>

                                <button
                                    onClick={() => toggleTenantStatus(t.id, t.status)}
                                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${t.status === 'ACTIVE'
                                            ? 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                        }`}
                                >
                                    {t.status === 'ACTIVE' ? 'Suspend Access' : 'Activate Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Global Wallet & Fee Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="premium-card bg-white p-8">
                    <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Global Tenant Wallets</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Tenant</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Available</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Pending</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Settled</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {wallets.map((w) => (
                                    <tr key={w.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 font-bold text-slate-900">{w.tenantName}</td>
                                        <td className="px-4 py-4 font-black text-right text-emerald-600">KES {Number(w.balance).toLocaleString()}</td>
                                        <td className="px-4 py-4 font-black text-right text-amber-600">KES {Number(w.pendingBalance).toLocaleString()}</td>
                                        <td className="px-4 py-4 font-black text-right text-sky-600">KES {Number(w.settledBalance).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="premium-card bg-white p-8">
                    <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Platform Fee Control</h3>
                    <div className="space-y-4">
                        {platformFees.map((fee) => (
                            <div key={fee.id} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">{fee.feeType}</p>
                                    <p className="font-bold text-slate-900">{fee.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-indigo-600">{fee.feeValue}{fee.isPercentage ? '%' : ' KES'}</p>
                                    <button className="text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-600 mt-1">Configure</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
