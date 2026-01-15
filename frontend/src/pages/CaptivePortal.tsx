import { useState, useEffect } from 'react';
import { Smartphone, Zap, Clock, Wifi, ShieldCheck, ChevronRight, Share2, Info } from 'lucide-react';
import axios from 'axios';

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
                <div className="w-16 h-16 bg-sky-500 rounded-3xl animate-bounce flex items-center justify-center shadow-2xl shadow-sky-500/40">
                    <Wifi size={32} />
                </div>
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-black tracking-tighter animate-pulse">SurfBill.</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-400 mt-2">Authenticating Hub</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 overflow-hidden relative">
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-slate-900 to-blue-900 rounded-b-[4rem] shadow-2xl"></div>
            <div className="absolute top-20 right-0 w-64 h-64 bg-sky-400 rounded-full blur-[120px] opacity-20 -mr-32 animate-pulse"></div>

            {/* Hero Section */}
            <div className="relative z-10 pt-16 pb-12 px-8 flex flex-col items-center text-center text-white">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[1.5rem] border border-white/20 flex items-center justify-center mb-6 shadow-2xl">
                    <Wifi size={24} className="text-sky-400" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter mb-2">High-Speed Access</h1>
                <p className="text-slate-400 font-bold text-sm tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    SurfBill Alpha Hub Online
                </p>
            </div>

            {/* Main Content Card */}
            <div className="relative z-20 px-6 max-w-md mx-auto -mt-4 pb-20">
                <div className="bg-white rounded-[3rem] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] p-8 border border-white">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Plans</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select your bandwidth</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-sky-500 cursor-pointer transition-colors">
                            <Info size={18} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {packages.map((pkg) => (
                            <button
                                key={pkg.id}
                                onClick={() => setSelectedPackage(pkg)}
                                className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-500 relative group ${selectedPackage?.id === pkg.id
                                    ? 'border-sky-500 bg-sky-50/50 shadow-xl shadow-sky-500/5'
                                    : 'border-slate-50 bg-slate-50/30 hover:border-slate-200 hover:bg-white'
                                    }`}
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl shadow-sm transition-all duration-500 ${selectedPackage?.id === pkg.id ? 'bg-sky-500 text-white shadow-sky-500/30 rotate-6' : 'bg-white text-slate-400'}`}>
                                            {pkg.durationMinutes < 1440 ? <Clock size={20} /> : <Zap size={20} />}
                                        </div>
                                        <div>
                                            <p className={`font-black tracking-tight mb-1 transition-colors ${selectedPackage?.id === pkg.id ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {pkg.name}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase text-sky-500 tracking-widest">
                                                    {pkg.speedLimit || 'Ultra Fast'}
                                                </span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                    {pkg.durationMinutes >= 1440 ? `${pkg.durationMinutes / 1440} Days` : `${pkg.durationMinutes / 60} Hour`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 font-bold mb-1 italic leading-none">KES</p>
                                        <p className="font-black text-2xl text-slate-900 tracking-tighter leading-none">{pkg.price}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-12 space-y-6">
                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors">
                                <Smartphone size={20} />
                            </div>
                            <input
                                type="tel"
                                placeholder="Enter M-Pesa Number"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] py-6 px-16 text-base font-black tracking-tight focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-inner placeholder:text-slate-300"
                            />
                        </div>

                        <button
                            onClick={handlePayment}
                            disabled={!selectedPackage}
                            className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 active:scale-95 ${selectedPackage
                                ? 'bg-[#0f172a] text-white shadow-2xl shadow-slate-900/30 hover:bg-slate-800'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            Activate Connection
                            <ChevronRight size={18} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-6">
                        <div className="flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" className="h-4" alt="M-Pesa" />
                            <div className="w-px h-3 bg-slate-300"></div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Encrypted B2C</span>
                            </div>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="w-12 h-px bg-slate-100 italic"></span>
                            SurfBill V2.0
                            <span className="w-12 h-px bg-slate-100 italic"></span>
                        </p>
                    </div>
                </div>

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
