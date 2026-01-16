import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Building2, CheckCircle2, Globe } from 'lucide-react';

const AdminDashboard = () => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/api/v1/superadmin/platform-stats');
                setStats(res.data);
            } catch (e) {
                console.error('Failed to load admin stats');
            }
        };
        fetchStats();
    }, []);

    if (!stats) {
        return (
            <div className="h-[60vh] flex items-center justify-center text-slate-400">
                Loading admin dashboard...
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
