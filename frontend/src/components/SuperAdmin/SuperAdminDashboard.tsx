import { useState, useEffect } from 'react';
import { Globe, Building2, TrendingUp, CheckCircle2, Clock, Activity } from 'lucide-react';
import axios from 'axios';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, tenantsRes, logsRes] = await Promise.all([
                    axios.get('/api/v1/superadmin/platform-stats'),
                    axios.get('/api/v1/superadmin/tenants'),
                    axios.get('/api/v1/superadmin/audit-logs')
                ]);
                setStats(statsRes.data);
                setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
                setAuditLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
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
        <div className="space-y-10 animate-float-slow">
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Platform Revenue', value: stats.totalRevenue, sub: 'Gross Ledger', icon: TrendingUp, color: 'indigo' },
                    { label: 'Active Tenants', value: stats.activeTenants, sub: `Out of ${stats.totalTenants} Total`, icon: Building2, color: 'sky' },
                    { label: 'Global Transactions', value: stats.totalPayments, sub: 'Success Rate: 98%', icon: CheckCircle2, color: 'emerald' },
                    { label: 'Nairobi Hub Load', value: 'Optimal', sub: 'Regional Cluster 1', icon: Globe, color: 'orange' }
                ].map((s, i) => (
                    <div key={i} className="premium-card group hover:-translate-y-2 transition-all duration-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{s.label}</p>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {typeof s.value === 'number' && s.label.includes('Revenue') ? `KES ${s.value.toLocaleString()}` : s.value}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 italic">{s.sub}</p>
                            </div>
                            <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600 group-hover:bg-${s.color}-500 group-hover:text-white transition-all`}>
                                <s.icon size={22} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Tenant Management */}
                <div className="premium-card !p-0 overflow-hidden shadow-2xl shadow-slate-200/20">
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-extrabold text-slate-900 flex items-center gap-3 text-lg tracking-tight">
                                <Building2 size={20} className="text-indigo-500" />
                                Tenant Governance
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Platform-wide Access Matrix</p>
                        </div>
                        <button className="btn-primary !py-2.5 !text-[10px] !rounded-xl !uppercase !tracking-widest">
                            Provision New
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm font-medium">
                            <thead className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6">Business Node</th>
                                    <th className="px-10 py-6">Identity</th>
                                    <th className="px-10 py-6">Status</th>
                                    <th className="px-10 py-6">Operation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 italic">
                                {tenants.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-10 py-7 font-black text-slate-900 text-base">{t.name}</td>
                                        <td className="px-10 py-7">
                                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-tighter">@{t.subdomain}</span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <span className={`status-pill pill-${t.status === 'ACTIVE' ? 'success' : 'danger'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <button
                                                onClick={() => toggleTenantStatus(t.id, t.status)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border-2 transition-all ${t.status === 'ACTIVE'
                                                    ? 'border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white'
                                                    : 'border-emerald-100 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                    }`}
                                            >
                                                {t.status === 'ACTIVE' ? 'Suspend' : 'Whitelst'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Platform Audit Trail */}
                <div className="bg-[#0f172a] rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200/20 overflow-hidden relative">
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="font-black text-white text-lg tracking-tight flex items-center gap-3">
                                <Clock size={20} className="text-indigo-400" />
                                Infrastructure Audit
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Real-time system events</p>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide relative z-10 font-mono">
                        {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                            <div key={i} className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-300">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                        {log.action}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed tracking-tight group-hover:text-white transition-colors">{log.details}</p>
                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className="text-[9px] text-slate-600 uppercase font-black">Operator ID: {log.userId?.slice(-6) || 'SYSTEM'}</span>
                                    <span className="text-[9px] text-slate-600 font-bold">{log.ipAddress || '127.0.0.1'}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="py-32 text-center opacity-20">
                                <Activity size={64} className="mx-auto mb-6" />
                                <p className="text-base font-black uppercase tracking-[0.4em]">Listening for Flux...</p>
                            </div>
                        )}
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
