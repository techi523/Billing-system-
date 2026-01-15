import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, ArrowRight, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/v1/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-sky-500/10 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "outCirc" }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl shadow-black/50">
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-16 h-16 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/30"
                        >
                            <Wifi size={28} className="text-white" />
                        </motion.div>
                        <motion.h1
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-black text-white tracking-tight"
                        >
                            Welcome Back
                        </motion.h1>
                        <motion.p
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-400 text-sm font-medium mt-2"
                        >
                            Sign in to your SurfBill Command Center
                        </motion.p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
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
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
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
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-2 rounded-lg"
                            >
                                {error}
                            </motion.p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Authenticating...' : 'Access Dashboard'}
                            {!loading && <ArrowRight size={18} strokeWidth={3} />}
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                            Powered by SurfBill v2.0
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
