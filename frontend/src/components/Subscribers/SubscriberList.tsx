import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, MoreHorizontal, Smartphone, Clock, Shield, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const SubscriberList = () => {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubscribers = async () => {
            try {
                const response = await axios.get('/api/v1/admin/subscribers');
                const mapped = response.data.map((s: any) => ({
                    id: s.id,
                    name: s.name || 'Anonymous',
                    phone: s.phoneNumber,
                    plan: s.package?.name || 'No Plan',
                    status: s.displayStatus,
                    usage: s.usagePercent,
                    expires: s.expiresIn
                }));
                setSubscribers(mapped);
            } catch (error) {
                console.error('Failed to fetch subscribers', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubscribers();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Subscribers</h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">Live session monitoring and CRM</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 w-64"
                        />
                    </div>
                    <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-500 hover:text-sky-600 hover:border-sky-200 transition-all">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="premium-card !p-0 overflow-hidden"
            >
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-6">User Identity</th>
                            <th className="px-8 py-6">Current Plan</th>
                            <th className="px-8 py-6">Data Usage</th>
                            <th className="px-8 py-6">Status</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center">
                                    <div className="flex items-center justify-center gap-2 text-slate-400 font-bold text-sm">
                                        <Loader2 size={20} className="animate-spin" />
                                        Loading Subscribers...
                                    </div>
                                </td>
                            </tr>
                        ) : subscribers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold text-sm">
                                    No subscribers found.
                                </td>
                            </tr>
                        ) : (
                            subscribers.map((sub, i) => (
                                <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={sub.id}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black shadow-inner">
                                                {sub.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{sub.name}</p>
                                                <p className="font-medium text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                                                    <Smartphone size={10} /> {sub.phone}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold">
                                            <Shield size={12} />
                                            {sub.plan}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="w-32">
                                            <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                                <span className="text-slate-600">Consumed</span>
                                                <span className={sub.usage > 90 ? 'text-rose-500' : 'text-slate-400'}>{sub.usage}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${sub.usage > 90 ? 'bg-rose-500' : 'bg-sky-500'}`}
                                                    style={{ width: `${sub.usage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className={`status-pill ${sub.status === 'Active' ? 'pill-success' :
                                                sub.status === 'Warning' ? 'pill-warning' : 'pill-danger'
                                                }`}>
                                                {sub.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                <Clock size={10} /> {sub.expires}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-all opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
};

export default SubscriberList;
