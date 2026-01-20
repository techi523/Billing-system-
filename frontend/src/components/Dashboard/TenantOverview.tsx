import { useState, useEffect } from 'react';
import { Users, Radio, CreditCard, Ticket, ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const StatCard = ({ label, value, trend, icon: Icon, color, index }: any) => (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.1 }}
        className="premium-card group relative overflow-hidden"
    >
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700`}></div>
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {trend > 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
                {Math.abs(trend)}%
            </div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h2>
    </motion.div>
);

const TenantOverview = () => {
    const [stats, setStats] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [statsRes, paymentsRes] = await Promise.all([
                    axios.get('/api/v1/admin/stats'),
                    axios.get('/api/v1/admin/reports/revenue')
                ]);
                setStats(statsRes.data);
                setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
            } catch (error) {
                console.error('Dashboard Fetch Failed');
            }
        };
        fetchDashboard();
    }, []);

    if (!stats) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Aggregating Global Metrics...</p>
        </div>
    );

    return (
        <div className="space-y-10">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard index={0} label="Monthly Revenue" value={`KES ${(stats.totalRevenue || 0).toLocaleString()}`} trend={12} icon={CreditCard} color="sky" />
                <StatCard index={1} label="Network Load" value={stats.activeSessions || 0} trend={-3} icon={Activity} color="orange" />
                <StatCard index={2} label="Managed Nodes" value={stats.totalSubscribers || 0} trend={8} icon={Radio} color="indigo" />
                <StatCard index={3} label="Voucher Volume" value={stats.voucherSales || 0} trend={24} icon={Ticket} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Recent Billing Events */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 premium-card overflow-hidden !p-0 border-slate-200/60 shadow-xl shadow-slate-200/20"
                >
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">Financial Overview</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live Transaction Ledger</p>
                        </div>
                        <button className="btn-secondary !py-2.5 !text-[10px] !uppercase !tracking-widest">
                            Export CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm font-medium">
                            <thead className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6">Status</th>
                                    <th className="px-10 py-6">Subscriber</th>
                                    <th className="px-10 py-6">Allocation</th>
                                    <th className="px-10 py-6 text-right">Settlement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {payments.slice(0, 8).map((p, i) => (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 + (i * 0.05) }}
                                        key={i}
                                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Successful</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-black">{p.phoneNumber}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-1 opacity-70 italic">{p.mpesaReceiptNumber || 'SB-AUTO-BATCH'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                {p.package?.name || 'Standard Plan'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <span className="text-lg font-black text-slate-900 leading-none">
                                                <span className="text-slate-400 text-xs font-bold mr-1 italic">KES</span>
                                                {p.amount}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {payments.length === 0 && (
                        <div className="p-20 text-center flex flex-col items-center opacity-30">
                            <Activity size={48} className="mb-4" />
                            <p className="font-black text-sm uppercase tracking-widest">No active sessions detected</p>
                        </div>
                    )}
                </motion.div>

                {/* Right Column Mix */}
                <div className="space-y-8">
                    {/* Revenue Viz (New) */}
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h4 className="font-black text-white text-lg tracking-tight">Revenue Flow</h4>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Last 7 Days Performance</p>
                            </div>
                            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                        </div>

                        {/* CSS Bar Chart */}
                        <div className="flex items-end justify-between gap-2 h-40 mb-4">
                            {[40, 65, 45, 90, 75, 50, 85].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end group">
                                    <div
                                        className="w-full bg-slate-800 rounded-t-lg relative overflow-hidden group-hover:bg-indigo-500/20 transition-colors"
                                        style={{ height: `${h}%` }}
                                    >
                                        <div
                                            className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-indigo-500 to-sky-400 opacity-60 group-hover:opacity-100 transition-all duration-500"
                                            style={{ height: '100%' }}
                                        ></div>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-bold text-center mt-2 group-hover:text-white transition-colors">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Quick Config Card */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="p-2 bg-sky-500 rounded-lg">
                                <TrendingUp size={16} />
                            </div>
                            <h4 className="font-black text-sky-400 text-[10px] uppercase tracking-[0.3em]">AI Trend Analysis</h4>
                        </div>
                        <p className="text-2xl font-black leading-tight tracking-tight mb-4">
                            Strategic <span className="text-sky-400">Yield Optimization</span> Identified.
                        </p>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10">
                            Your 'Enterprise 50MB' plan at Node: CBD is currently under-utilized. A temporary 15% discount could boost conversions by 24% this weekend.
                        </p>
                        <button className="w-full bg-white text-slate-900 rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-sky-400 hover:text-white transition-all shadow-xl shadow-white/5">
                            Implement Strategy
                        </button>
                    </div>
                </motion.div>

                {/* Quick Config Card */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="premium-card !p-10"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.3em]">Command Center</h4>
                        <div className="h-1 w-8 bg-sky-500 rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: 'Node Add', icon: Radio, sub: 'Network' },
                            { label: 'Plan Mod', icon: CreditCard, sub: 'Fintech' },
                            { label: 'Batch Gen', icon: Ticket, sub: 'Vouchers' },
                            { label: 'Audit', icon: Users, sub: 'Security' }
                        ].map((item, i) => (
                            <button key={i} className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/50 transition-all text-center group">
                                <item.icon size={24} className="mb-3 text-slate-400 group-hover:text-sky-600 group-hover:-translate-y-1 transition-all" strokeWidth={2.5} />
                                <span className="text-[11px] font-black text-slate-900 leading-tight uppercase tracking-tight">{item.label}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{item.sub}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
        </div >
    );
};

export default TenantOverview;
