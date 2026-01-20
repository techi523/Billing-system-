import { useState, useEffect } from 'react';
import { Smartphone, Zap, Clock, Wifi, ShieldCheck, ChevronRight, Share2, Info } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const CaptivePortal = () => {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        const fetchPackages = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantId = urlParams.get('tenantId') || 'demo';
            try {
                const res = await axios.get(`/api/v1/portal/${tenantId}/packages`);
                setPackages(Array.isArray(res.data) ? res.data : []);
                setLoading(false);
            } catch (e) {
                console.error('Failed to load packages');
                setLoading(false);
            }
        };
        fetchPackages();
    }, []);

    const handlePayment = async () => {
        if (!selectedPackage || !phoneNumber) return alert('Select a plan and enter your phone number');
        alert('Payment instruction sent to ' + phoneNumber + '. Enter PIN to activate ' + selectedPackage.name);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#0f172a] text-white">
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 bg-sky-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-sky-500/40"
                >
                    <Wifi size={32} />
                </motion.div>
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-black tracking-tighter">SurfBill.</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-400 mt-2">Authenticating Hub</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 overflow-hidden relative">
            {/* Background Decorative Blobs */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
                className="absolute top-0 left-0 w-full h-full bg-[#0f172a]"
            ></motion.div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -mr-32 -mt-32 animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[100px] -ml-20 -mb-20 animate-float-delayed"></div>

            {/* Hero Section */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 pt-12 pb-8 px-8 flex flex-col items-center text-center text-white"
            >
                <div className="w-20 h-20 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/20 animate-float">
                    <Wifi size={32} className="text-sky-400 neon-text" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    High-Speed <span className="text-sky-400">Flux</span>
                </h1>
                <p className="text-slate-400 font-bold text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Secure Access Hub
                </p>
            </motion.div>

            {/* Main Content Card */}
            <div className="relative z-20 px-6 max-w-md mx-auto -mt-4 pb-20">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="glass-panel-dark rounded-[2.5rem] p-8"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">Select Bandwidth</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Instant Activation</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-sky-400 cursor-pointer transition-colors border border-white/5">
                            <Info size={18} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {packages.map((pkg, i) => (
                            <motion.button
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                key={pkg.id}
                                onClick={() => setSelectedPackage(pkg)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full text-left p-5 rounded-[2rem] border transition-all duration-300 relative group overflow-hidden ${selectedPackage?.id === pkg.id
                                    ? 'border-sky-500/50 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                                    : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl transition-all duration-500 ${selectedPackage?.id === pkg.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40 rotate-6' : 'bg-slate-800 text-slate-500'}`}>
                                            {pkg.durationMinutes < 1440 ? <Clock size={18} /> : <Zap size={18} />}
                                        </div>
                                        <div>
                                            <p className={`font-black tracking-tight mb-1 text-sm transition-colors ${selectedPackage?.id === pkg.id ? 'text-white' : 'text-slate-300'}`}>
                                                {pkg.name}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase text-sky-400 tracking-widest">
                                                    {pkg.speedLimit || 'Ultra Fast'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 font-bold mb-0.5 italic leading-none">KES</p>
                                        <p className={`font-black text-xl tracking-tighter leading-none ${selectedPackage?.id === pkg.id ? 'text-white neon-text' : 'text-slate-400'}`}>{pkg.price}</p>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    <div className="mt-10 space-y-5">
                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                <Smartphone size={18} />
                            </div>
                            <input
                                type="tel"
                                placeholder="M-Pesa Number"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-[#0f172a] border border-white/10 rounded-[2rem] py-5 px-14 text-sm font-bold text-white tracking-widest focus:outline-none focus:border-sky-500/50 focus:bg-slate-900 transition-all shadow-inner placeholder:text-slate-600"
                            />
                        </div>

                        <motion.button
                            onClick={handlePayment}
                            disabled={!selectedPackage}
                            whileHover={selectedPackage ? { scale: 1.02, boxShadow: "0 0 20px rgba(14, 165, 233, 0.4)" } : {}}
                            whileTap={selectedPackage ? { scale: 0.98 } : {}}
                            className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${selectedPackage
                                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-900/20 relative overflow-hidden'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            {selectedPackage && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                            <span className="relative z-10">Initiate Access</span>
                            <ChevronRight size={16} strokeWidth={3} className="relative z-10" />
                        </motion.button>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                            {/* Placeholder for M-Pesa Logo if no external image allowed, using text for now */}
                            <span className="text-white font-black tracking-tighter italic text-sm">M-PESA</span>
                            <div className="w-px h-3 bg-slate-700"></div>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Secure B2C Channel</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="mt-10 flex justify-center gap-10 opacity-30">
                    <button className="text-[10px] font-black text-slate-900 uppercase tracking-widest hover:opacity-100 flex items-center gap-2">
                        <Share2 size={12} /> Share Network
                    </button>
                    <button className="text-[10px] font-black text-slate-900 uppercase tracking-widest hover:opacity-100">
                        Fair Usage Policy
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CaptivePortal;
