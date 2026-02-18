import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Building2, CheckCircle2, Globe, Users, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const DemoAdmin = () => {
    const stats = {
        totalRevenue: 1250000,
        activeTenants: 15,
        totalTenants: 25,
        totalPayments: 8947,
        platformUptime: '99.8%'
    };

    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Try to connect to backend
        const testConnection = async () => {
            try {
                await axios.get('/api/v1/superadmin/platform-stats', { timeout: 3000 });
                setIsConnected(true);
            } catch {
                setIsConnected(false);
            }
        };
        testConnection();
    }, []);

    const cards = [
        { label: 'Platform Revenue', value: `KES ${stats.totalRevenue?.toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
        { label: 'Active Tenants', value: stats.activeTenants, sub: `out of ${stats.totalTenants}`, icon: Building2, color: 'sky' },
        { label: 'Global Transactions', value: stats.totalPayments, icon: CheckCircle2, color: 'emerald' },
        { label: 'Platform Uptime', value: stats.platformUptime, icon: Globe, color: 'orange' },
        { label: 'Active Users', value: '2,154', icon: Users, color: 'violet' },
        { label: 'Daily Revenue', value: 'KES 45,200', icon: CreditCard, color: 'rose' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
            {/* Demo Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <span className="font-black text-sm tracking-widest">DEMO ADMIN DASHBOARD</span>
                        <span className="text-indigo-200 text-xs">No authentication required</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isConnected ? 'BACKEND CONNECTED' : 'DEMO MODE'}
                        </span>
                        <a href="/login" className="bg-white/10 px-4 py-2 rounded-lg font-bold hover:bg-white/20 transition-colors">
                            ← Back to Login
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Admin Dashboard</h1>
                    <p className="text-slate-600 font-bold">SurfBill Platform Analytics & Management</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((c, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="premium-card group hover:-translate-y-2 transition-all duration-500 bg-white"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">{c.label}</p>
                                    <h3 className="text-2xl font-black text-slate-900">{c.value}</h3>
                                    {c.sub && <p className="text-xs text-slate-500 mt-1 italic">{c.sub}</p>}
                                </div>
                                <div className={`p-3 rounded-2xl bg-${c.color}-50 text-${c.color}-600 group-hover:scale-110 transition-transform duration-300`}>
                                    <c.icon size={24} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Demo Data Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="premium-card bg-white"
                    >
                        <h3 className="text-xl font-black text-slate-900 mb-6">Recent Activity</h3>
                        <div className="space-y-4">
                            {[
                                { action: 'New tenant created', time: '2 min ago', type: 'success' },
                                { action: 'Payment processed', time: '15 min ago', type: 'info' },
                                { action: 'Router configuration updated', time: '1 hour ago', type: 'warning' },
                                { action: 'System backup completed', time: '3 hours ago', type: 'success' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="font-bold text-slate-900">{item.action}</p>
                                        <p className="text-xs text-slate-500">{item.time}</p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${item.type === 'success' ? 'bg-emerald-500' : item.type === 'info' ? 'bg-sky-500' : 'bg-amber-500'}`}></div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="premium-card bg-white"
                    >
                        <h3 className="text-xl font-black text-slate-900 mb-6">System Status</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600">Database</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-black rounded-full">HEALTHY</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600">API Gateway</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-black rounded-full">HEALTHY</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600">Payment Processor</span>
                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-black rounded-full">MAINTENANCE</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-600">MikroTik Integration</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-black rounded-full">HEALTHY</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="text-center py-8 border-t border-slate-200">
                    <p className="text-slate-500 text-sm font-bold tracking-widest">
                        SurfBill Platform v2.0 • Demo Mode • All data is simulated
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DemoAdmin;
