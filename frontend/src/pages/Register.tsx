import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, User, Globe, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/logo.png';
import SupportFooter from '../components/Common/SupportFooter';

const Register = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [tenantName, setTenantName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post('/api/v1/auth/register', {
                email,
                password,
                tenantName,
                subdomain
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Please contact support.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] text-center max-w-md w-full"
                >
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowRight className="text-emerald-400 rotate-[-45deg]" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Registration Successful!</h2>
                    <p className="text-slate-400 font-medium mb-6">Your SurfBill account has been created. Redirecting to login...</p>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 3 }}
                            className="h-full bg-emerald-500"
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[60%] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl relative z-10"
            >
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                    <div className="text-center mb-10">
                        <img src={logo} alt="SurfBill" className="w-20 h-20 mx-auto mb-4" />
                        <h1 className="text-3xl font-black text-white tracking-tight">Create Tenant Account</h1>
                        <p className="text-slate-400 text-sm font-medium mt-2">Start your production-grade ISP/Hotspot billing</p>
                    </div>

                    <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 md:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Business Details</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                    <Building size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Business Name"
                                    value={tenantName}
                                    onChange={(e) => setTenantName(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                                />
                            </div>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                    <Globe size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Preferred Subdomain (e.g. fastwifi)"
                                    value={subdomain}
                                    onChange={(e) => setSubdomain(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">.surfbill.com</span>
                            </div>
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Admin Account</label>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                required
                                placeholder="Admin Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                required
                                placeholder="Secure Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="md:col-span-2 text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-3 rounded-xl border border-rose-500/20">
                                {error}
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="md:col-span-2 w-full bg-sky-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-400 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Initialize Tenant'}
                            {!loading && <ArrowRight size={18} strokeWidth={3} />}
                        </motion.button>
                    </form>

                    <p className="mt-8 text-center text-slate-400 text-xs font-bold">
                        Already registered?{' '}
                        <button onClick={() => navigate('/login')} className="text-sky-400 hover:text-sky-300 underline">
                            Sign In
                        </button>
                    </p>
                </div>
            </motion.div>

            {/* Page Footer */}
            <div className="absolute bottom-0 left-0 w-full z-10 opacity-40 hover:opacity-100 transition-opacity">
                <SupportFooter />
            </div>
        </div>
    );
};

export default Register;
