import React, { useState, useEffect } from 'react';
import {
    Plus,
    Wifi,
    Clock,
    Database,
    Trash2,
    Edit,
    Save,
    X,
    Users,
    Zap
} from 'lucide-react';
import axios from 'axios';
import BackButton from '../components/Common/BackButton';

interface Package {
    id: string;
    name: string;
    price: number;
    validityHours: number;
    validityDays: number;
    dataLimitMB: number;
    uploadSpeed: string;
    downloadSpeed: string;
    sharedUsers: number;
    isActive: boolean;
}

const Packages = () => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        validityType: 'days', // 'hours' or 'days'
        validityValue: '30',
        dataLimitMB: '',
        uploadSpeed: '1M',
        downloadSpeed: '2M',
        sharedUsers: '1'
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const response = await axios.get('/api/v1/packages');
            setPackages(response.data);
        } catch (error) {
            console.error('Failed to fetch packages', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                validityHours: formData.validityType === 'hours' ? parseInt(formData.validityValue) : null,
                validityDays: formData.validityType === 'days' ? parseInt(formData.validityValue) : null,
                dataLimitMB: formData.dataLimitMB ? parseInt(formData.dataLimitMB) : null,
                sharedUsers: parseInt(formData.sharedUsers)
            };

            await axios.post('/api/v1/packages', payload);
            setIsAdding(false);
            fetchPackages();
            setFormData({
                name: '',
                price: '',
                validityType: 'days',
                validityValue: '30',
                dataLimitMB: '',
                uploadSpeed: '1M',
                downloadSpeed: '2M',
                sharedUsers: '1'
            });
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create package');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        try {
            await axios.delete(`/api/v1/packages/${id}`);
            fetchPackages();
        } catch (error) {
            alert('Failed to delete package. It might be in use.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <header className="bg-slate-900 text-white px-8 py-10 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-8 left-8 z-50">
                    <BackButton to="/tenant" variant="light" label="Back" />
                </div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="text-yellow-400 w-8 h-8" />
                                <h1 className="text-4xl font-black tracking-tighter">Billing <span className="text-yellow-400">Packages</span></h1>
                            </div>
                            <p className="text-slate-400 font-bold text-lg leading-relaxed">Define prices, speeds, and limits for your subscribers.</p>
                        </div>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-sky-600 transition-all shadow-xl shadow-sky-900/20"
                        >
                            <Plus className="w-5 h-5" /> New Package
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-12">
                {isAdding && (
                    <div className="mb-12 bg-white rounded-[3rem] p-12 border border-slate-200 shadow-xl">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-2xl font-black">Create New Package</h2>
                            <button onClick={() => setIsAdding(false)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200"><X /></button>
                        </div>

                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Package Name</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold" placeholder="e.g. 30 Days Unlimited" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Price (KES)</label>
                                    <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold text-sky-600" placeholder="0.00" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Validity</label>
                                    <div className="flex gap-2 mb-2">
                                        <button type="button" onClick={() => setFormData({ ...formData, validityType: 'days' })} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase ${formData.validityType === 'days' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Days</button>
                                        <button type="button" onClick={() => setFormData({ ...formData, validityType: 'hours' })} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase ${formData.validityType === 'hours' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Hours</button>
                                    </div>
                                    <input required type="number" value={formData.validityValue} onChange={e => setFormData({ ...formData, validityValue: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold text-center" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Data Limit (MB)</label>
                                    <input type="number" placeholder="Leave empty for Unlimited" value={formData.dataLimitMB} onChange={e => setFormData({ ...formData, dataLimitMB: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Speed Profile</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Up</p>
                                            <input type="text" value={formData.uploadSpeed} onChange={e => setFormData({ ...formData, uploadSpeed: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold text-center" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Down</p>
                                            <input type="text" value={formData.downloadSpeed} onChange={e => setFormData({ ...formData, downloadSpeed: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold text-center" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Shared Users</label>
                                    <input type="number" value={formData.sharedUsers} onChange={e => setFormData({ ...formData, sharedUsers: e.target.value })} className="w-full bg-slate-50 border border-slate-200 py-4 px-6 rounded-2xl font-bold text-center" />
                                </div>
                            </div>

                            <div className="lg:col-span-3 pt-6 border-t border-slate-100">
                                <button type="submit" disabled={loading} className="w-full bg-sky-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-sky-500/20 hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" /> Create & Sync to Routers
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {loading && !isAdding ? (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Packages...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {packages.map((pkg) => (
                            <div key={pkg.id} className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm hover:border-sky-200 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-sky-500 group-hover:text-white transition-all transform group-hover:rotate-6">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Price</p>
                                        <h3 className="text-2xl font-black text-slate-900">KES {pkg.price}</h3>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-sky-600 transition-colors">{pkg.name}</h3>

                                <div className="grid grid-cols-2 gap-4 mb-10">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Validity</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {pkg.validityDays ? `${pkg.validityDays} Days` : `${pkg.validityHours} Hours`}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Database className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Data</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            {pkg.dataLimitMB ? `${pkg.dataLimitMB} MB` : 'Unlimited'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Zap className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Speed</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{pkg.downloadSpeed}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                            <Users className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Users</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">{pkg.sharedUsers} User{pkg.sharedUsers > 1 ? 's' : ''}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                                        <Edit className="w-4 h-4" /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(pkg.id)} className="w-14 py-4 bg-rose-50 text-rose-500 rounded-xl font-black text-xs uppercase flex items-center justify-center hover:bg-rose-100 transition-all border border-rose-100">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {packages.length === 0 && !loading && (
                            <div className="col-span-full py-20 bg-white rounded-[3rem] border border-dashed border-slate-300 text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                                    <Wifi className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">Configure Your First Package</h3>
                                <p className="text-slate-400 font-bold mb-8 max-w-sm">You haven't created any billing packages yet. Subscribers need these to buy internet.</p>
                                <button onClick={() => setIsAdding(true)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black">Get Started</button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Packages;
