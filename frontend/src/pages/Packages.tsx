import React, { useState, useEffect } from 'react';
import {
    Plus, Wifi, Clock, Database, Trash2, Edit, Save, X, Users, Zap,
    RefreshCw, Shield, AlertCircle, TrendingUp, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import BackButton from '../components/Common/BackButton';

interface PackageStats {
    salesCount: number;
    revenue: number;
    activeUsers: number;
    expiredSessions: number;
}

interface Package {
    id: number;
    name: string;
    price: string;
    type: 'HOTSPOT' | 'ISP';
    durationMinutes: number | null;
    dataLimitBytes: string | null;
    downloadSpeed: string;
    uploadSpeed: string;
    validity: number;
    sharedUsers: number;
    expiryAction: 'SUSPEND' | 'DELETE' | 'NOTIFY';
    isEnabled: boolean;
    description: string;
    stats?: PackageStats;
}

const Packages = () => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [error, setError] = useState('');

    const initialFormData = {
        name: '',
        price: '',
        type: 'HOTSPOT',
        durationValue: '60',
        durationType: 'minutes', // 'minutes', 'hours', 'days'
        dataLimitEnabled: false,
        dataLimitValue: '1024', // MB
        downloadSpeed: '2M',
        uploadSpeed: '1M',
        validity: '30',
        sharedUsers: '1',
        expiryAction: 'SUSPEND',
        description: '',
        isVisible: true
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const response = await axios.get('/api/v1/admin/packages');
            setPackages(response.data);
        } catch (err: any) {
            setError('Failed to load packages. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (id: number) => {
        setSyncingId(id);
        try {
            const res = await axios.post(`/api/v1/admin/packages/${id}/sync`);
            if (res.data.success) {
                alert('Successfully synced to all routers!');
            } else {
                const failed = res.data.results.filter((r: any) => r.status === 'FAILED');
                alert(`Sync completed with issues:\n${failed.map((f: any) => `${f.routerName}: ${f.error}`).join('\n')}`);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Sync failed');
        } finally {
            setSyncingId(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Convert values
            const durationMinutes = formData.durationType === 'days'
                ? parseInt(formData.durationValue) * 1440
                : formData.durationType === 'hours'
                    ? parseInt(formData.durationValue) * 60
                    : parseInt(formData.durationValue);

            const dataLimitBytes = formData.dataLimitEnabled
                ? BigInt(formData.dataLimitValue) * BigInt(1024 * 1024)
                : null;

            const payload = {
                ...formData,
                durationMinutes,
                dataLimitBytes: dataLimitBytes ? dataLimitBytes.toString() : null,
                price: formData.price,
                validity: parseInt(formData.validity),
                sharedUsers: parseInt(formData.sharedUsers)
            };

            if (editingPackage) {
                await axios.put(`/api/v1/admin/packages/${editingPackage.id}`, payload);
            } else {
                await axios.post('/api/v1/admin/packages', payload);
            }

            setIsAdding(false);
            setEditingPackage(null);
            fetchPackages();
            setFormData(initialFormData);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this package? This action cannot be undone if no subscribers are active.')) return;
        try {
            await axios.post(`/api/v1/admin/packages/${id}/delete`);
            fetchPackages();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete package');
        }
    };

    const openEdit = (pkg: Package) => {
        const durationType = pkg.durationMinutes && pkg.durationMinutes >= 1440 ? 'days' : (pkg.durationMinutes && pkg.durationMinutes >= 60 ? 'hours' : 'minutes');
        const durationValue = durationType === 'days' ? (pkg.durationMinutes! / 1440).toString() : (durationType === 'hours' ? (pkg.durationMinutes! / 60).toString() : (pkg.durationMinutes || '0').toString());

        setFormData({
            ...initialFormData,
            name: pkg.name,
            price: pkg.price.toString(),
            type: pkg.type,
            durationValue,
            durationType,
            dataLimitEnabled: pkg.dataLimitBytes !== null,
            dataLimitValue: pkg.dataLimitBytes ? (BigInt(pkg.dataLimitBytes) / BigInt(1024 * 1024)).toString() : '1024',
            downloadSpeed: pkg.downloadSpeed,
            uploadSpeed: pkg.uploadSpeed,
            validity: pkg.validity.toString(),
            sharedUsers: pkg.sharedUsers.toString(),
            expiryAction: pkg.expiryAction,
            description: pkg.description || ''
        });
        setEditingPackage(pkg);
        setIsAdding(true);
    };

    // Calculate totals for analytics bar
    const totalRev = packages.reduce((sum, pkg) => sum + (pkg.stats?.revenue || 0), 0);
    const totalSales = packages.reduce((sum, pkg) => sum + (pkg.stats?.salesCount || 0), 0);
    const totalUsers = packages.reduce((sum, pkg) => sum + (pkg.stats?.activeUsers || 0), 0);

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans pb-20 transition-colors duration-300">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[50%] bg-sky-500/5 rounded-full blur-[100px]"></div>
            </div>

            <header className="relative z-10 px-8 pt-12 pb-16 bg-[var(--bg-surface)] backdrop-blur-3xl border-b border-[var(--border-subtle)] transition-colors duration-300">
                <div className="absolute top-8 left-8">
                    <BackButton to="/tenant" variant="light" label="Dashboard" />
                </div>

                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                                <Zap className="text-white w-7 h-7" />
                            </div>
                            <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">Billing <span className="text-sky-400">Packages</span></h1>
                        </div>
                        <p className="text-[var(--text-secondary)] font-medium text-lg">Directly control your revenue streams and bandwidth profiles.</p>
                    </div>

                    <button
                        onClick={() => { setIsAdding(true); setEditingPackage(null); setFormData(initialFormData); }}
                        className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-sky-600 transition-all transform hover:scale-105 shadow-2xl shadow-sky-500/20"
                    >
                        <Plus className="w-6 h-6 border-2 border-current rounded-lg p-0.5" /> Create New Package
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 relative z-20 -mt-10">
                {/* Global Analytics Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Total Revenue', value: `KES ${totalRev.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: 'Total Sales', value: totalSales, icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                        { label: 'Active Users', value: totalUsers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { label: 'Avg Pkg Price', value: `KES ${packages.length ? Math.round(packages.reduce((s, p) => s + parseInt(p.price), 0) / packages.length) : 0}`, icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                    ].map((stat, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            key={i} className="bg-slate-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] flex items-center gap-5"
                        >
                            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                                <stat.icon size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">{stat.label}</p>
                                <p className="text-xl font-black text-white">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="mb-12 overflow-hidden"
                        >
                            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 md:p-14 shadow-2xl">
                                <div className="flex justify-between items-center mb-12">
                                    <div>
                                        <h2 className="text-3xl font-black text-white">{editingPackage ? 'Edit Package' : 'New Commerce Package'}</h2>
                                        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">MikroTik Profile Sync Enabled</p>
                                    </div>
                                    <button onClick={() => setIsAdding(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
                                    {/* Column 1: Identity */}
                                    <div className="space-y-8">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-4">Package Identity</label>
                                            <div className="space-y-6">
                                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold focus:border-sky-500 focus:outline-none transition-all" placeholder="Package Name" />

                                                <div className="relative">
                                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
                                                    <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-bold focus:border-emerald-500 focus:outline-none transition-all" placeholder="Price (KES)" />
                                                </div>

                                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold focus:border-sky-500 focus:outline-none transition-all appearance-none cursor-pointer">
                                                    <option value="HOTSPOT">Hotspot (Voucher/Login)</option>
                                                    <option value="ISP">Fixed Home (PPPoE)</option>
                                                </select>

                                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-medium text-sm focus:border-sky-500 focus:outline-none transition-all h-32" placeholder="Description (Optional)" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Limits */}
                                    <div className="space-y-8">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-4">Quota & Validity</label>
                                            <div className="space-y-6">
                                                <div className="bg-slate-900/40 p-1 border border-white/5 rounded-2xl flex">
                                                    {['minutes', 'hours', 'days'].map(t => (
                                                        <button key={t} type="button" onClick={() => setFormData({ ...formData, durationType: t })}
                                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.durationType === t ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-white'}`}>
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input required type="number" value={formData.durationValue} onChange={e => setFormData({ ...formData, durationValue: e.target.value })}
                                                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-center text-xl" />

                                                <div className="pt-4 border-t border-white/5">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-xs font-bold text-slate-400">Enable Data Cap?</span>
                                                        <button type="button" onClick={() => setFormData({ ...formData, dataLimitEnabled: !formData.dataLimitEnabled })}
                                                            className={`w-12 h-6 rounded-full transition-all relative ${formData.dataLimitEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.dataLimitEnabled ? 'left-7' : 'left-1'}`}></div>
                                                        </button>
                                                    </div>
                                                    {formData.dataLimitEnabled && (
                                                        <div className="relative">
                                                            <input type="number" value={formData.dataLimitValue} onChange={e => setFormData({ ...formData, dataLimitValue: e.target.value })}
                                                                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold" />
                                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">MB</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Account Validity (Days)</label>
                                                    <input required type="number" value={formData.validity} onChange={e => setFormData({ ...formData, validity: e.target.value })}
                                                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3: Network */}
                                    <div className="space-y-8">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-4">Network & QoS</label>
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Download</span>
                                                        <input required type="text" value={formData.downloadSpeed} onChange={e => setFormData({ ...formData, downloadSpeed: e.target.value })}
                                                            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-center" placeholder="5M" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Upload</span>
                                                        <input required type="text" value={formData.uploadSpeed} onChange={e => setFormData({ ...formData, uploadSpeed: e.target.value })}
                                                            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold text-center" placeholder="2M" />
                                                    </div>
                                                </div>

                                                <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-3 block">Expiry Behavior</label>
                                                    <div className="space-y-3">
                                                        {['SUSPEND', 'DELETE', 'NOTIFY'].map(action => (
                                                            <label key={action} className="flex items-center gap-3 cursor-pointer group">
                                                                <input type="radio" name="expiryAction" value={action} checked={formData.expiryAction === action}
                                                                    onChange={e => setFormData({ ...formData, expiryAction: e.target.value as any })} className="hidden" />
                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.expiryAction === action ? 'border-sky-500 bg-sky-500' : 'border-slate-700'}`}>
                                                                    {formData.expiryAction === action && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                </div>
                                                                <span className={`text-xs font-bold transition-all ${formData.expiryAction === action ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`}>{action}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Device Limit</label>
                                                    <input required type="number" value={formData.sharedUsers} onChange={e => setFormData({ ...formData, sharedUsers: e.target.value })}
                                                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 pt-10 border-t border-white/5 mt-4">
                                        {error && <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 font-bold text-center text-sm">{error}</div>}
                                        <div className="flex gap-6">
                                            <button type="submit" disabled={loading} className="flex-[3] bg-sky-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-sky-500/20 hover:bg-sky-400 transition-all flex items-center justify-center gap-3 active:scale-95">
                                                {loading ? <RefreshCw className="animate-spin" /> : (editingPackage ? <><Save /> Save Changes & Re-Sync</> : <><Save /> Activate & Deploy Package</>)}
                                            </button>
                                            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 text-white py-5 rounded-[2rem] font-bold hover:bg-white/10 transition-all">Cancel</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Packages Table List */}
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Wifi className="text-sky-400" /> Active Inventory
                        </h3>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Local DB</div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-sky-500 rounded-full"></div> Cloud Sync</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 bg-black/20">
                                    <th className="px-10 py-6">Package Identity</th>
                                    <th className="px-6 py-6">Type & Validity</th>
                                    <th className="px-6 py-6">Billing Price</th>
                                    <th className="px-6 py-6">Network Limits</th>
                                    <th className="px-6 py-6">Sales Performance</th>
                                    <th className="px-6 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {packages.map((pkg) => (
                                    <tr key={pkg.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                                    {pkg.type === 'HOTSPOT' ? <Wifi size={20} /> : <Database size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-base">{pkg.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: #{pkg.id.toString().padStart(4, '0')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="space-y-1">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${pkg.type === 'HOTSPOT' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                    {pkg.type} Profile
                                                </span>
                                                <p className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                                    <Clock size={12} className="text-slate-500" />
                                                    {pkg.durationMinutes ? (pkg.durationMinutes >= 1440 ? `${pkg.durationMinutes / 1440} Days` : (pkg.durationMinutes >= 60 ? `${pkg.durationMinutes / 60} Hours` : `${pkg.durationMinutes} Minutes`)) : 'No limit'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase italic">Valid {pkg.validity} Days</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <span className="text-xl font-black text-emerald-400">KES {pkg.price}</span>
                                        </td>
                                        <td className="px-6 py-8 text-sm font-bold text-slate-400">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2"><Zap size={14} className="text-yellow-500" /> {pkg.downloadSpeed} / {pkg.uploadSpeed}</div>
                                                <div className="flex items-center gap-2"><Database size={14} className="text-slate-500" /> {pkg.dataLimitBytes ? `${Math.round(Number(BigInt(pkg.dataLimitBytes) / BigInt(1024 * 1024)))} MB` : 'Unlimited Data'}</div>
                                                <div className="flex items-center gap-2"><Users size={14} className="text-slate-500" /> {pkg.sharedUsers} Devices</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-white">{pkg.stats?.salesCount || 0} Sales</p>
                                                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, (pkg.stats?.salesCount || 0) * 2)}%` }}></div>
                                                </div>
                                                <p className="text-[10px] font-bold text-emerald-400 tracking-tighter uppercase">KES {(pkg.stats?.revenue || 0).toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleSync(pkg.id)} disabled={syncingId === pkg.id}
                                                    className={`p-3 rounded-xl transition-all ${syncingId === pkg.id ? 'bg-sky-500 text-white' : 'bg-white/5 text-sky-400 hover:bg-sky-500 hover:text-white'}`} title="Sync to MikroTik">
                                                    <RefreshCw size={18} className={syncingId === pkg.id ? 'animate-spin' : ''} />
                                                </button>
                                                <button onClick={() => openEdit(pkg)} className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/20 transition-all border border-white/5" title="Edit">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(pkg.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {packages.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center">
                                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
                                                <AlertCircle size={40} />
                                            </div>
                                            <h4 className="text-xl font-black text-white mb-2">Inventory Empty</h4>
                                            <p className="text-slate-500 font-bold mb-10 max-w-xs mx-auto text-sm">Create your first billing package to start selling internet access.</p>
                                            <button onClick={() => setIsAdding(true)} className="bg-sky-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-sky-500/20 active:scale-95 transition-transform">Get Started</button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Packages;
