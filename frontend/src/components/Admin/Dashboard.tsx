import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Building2, CheckCircle2, Globe, AlertCircle, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            setError(null);

            console.log('AdminDashboard: Starting stats fetch...');

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const res = await axios.get('/api/v1/superadmin/platform-stats', {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                console.log('AdminDashboard: Stats fetch successful', res.data);
                setStats(res.data);
                setIsLoading(false);
            } catch (err: any) {
                console.error('AdminDashboard: Stats fetch failed', err);
                setError(err.message || 'Failed to load dashboard data');
                setIsLoading(false);

                // Set default stats for fallback UI
                setStats({
                    totalRevenue: 0,
                    activeTenants: 0,
                    totalTenants: 0,
                    totalPayments: 0
                });
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <h2 className="text-3xl font-black text-slate-900">Admin Dashboard</h2>
                <div className="h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-bold">Loading dashboard data...</p>
                        <p className="text-sm text-slate-400 mt-2">This may take a moment</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-8">
                <h2 className="text-3xl font-black text-slate-900">Admin Dashboard</h2>
                <div className="premium-card bg-white">
                    <div className="p-6 text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Dashboard</h3>
                        <p className="text-slate-600 mb-6">{error}</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-sky-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-sky-600 transition-colors flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry
                            </button>
                            <button
                                onClick={() => {
                                    setStats({
                                        totalRevenue: 0,
                                        activeTenants: 0,
                                        totalTenants: 0,
                                        totalPayments: 0
                                    });
                                    setError(null);
                                }}
                                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            >
                                Show Empty Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const cards = [
        { label: 'Platform Revenue', value: `KES ${stats.totalRevenue?.toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
        { label: 'Active Tenants', value: stats.activeTenants, sub: `out of ${stats.totalTenants}`, icon: Building2, color: 'sky' },
        { label: 'Global Transactions', value: stats.totalPayments, icon: CheckCircle2, color: 'emerald' },
        { label: 'Nairobi Hub Load', value: 'Optimal', icon: Globe, color: 'orange' },
    ];

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-black text-slate-900">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((c, i) => (
                    <div key={i} className={`premium-card group hover:-translate-y-2 transition-all duration-500 bg-white`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">{c.label}</p>
                                <h3 className="text-2xl font-black text-slate-900">{c.value}</h3>
                                {c.sub && <p className="text-xs text-slate-500 mt-1 italic">{c.sub}</p>}
                            </div>
                            <div className={`p-3 rounded-2xl bg-${c.color}-50 text-${c.color}-600`}>
                                <c.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboard;
