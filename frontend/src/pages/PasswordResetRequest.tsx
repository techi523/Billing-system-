import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/logo.png';
import BackButton from '../components/Common/BackButton';

const PasswordResetRequest = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await axios.post('/api/v1/auth/password-reset/request', { email });
            setMessage(res.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Nav Control */}
            <div className="absolute top-8 left-8 z-50">
                <BackButton to="/login" label="Back to Login" variant="light" />
            </div>

            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-rose-600/10 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                    <div className="text-center mb-10">
                        <img src={logo} alt="SurfBill" className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-black text-white tracking-tight">Reset Password</h1>
                        <p className="text-slate-400 text-sm font-medium mt-2">Enter your email and we'll send a recovery link</p>
                    </div>

                    {!message ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    placeholder="Account Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                                />
                            </div>

                            {error && (
                                <p className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-2 rounded-lg">{error}</p>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-400 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : 'Send Recovery Link'}
                                <Send size={16} />
                            </motion.button>
                        </form>
                    ) : (
                        <div className="text-center">
                            <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl font-bold text-sm mb-6 border border-emerald-500/20">
                                {message}
                            </div>
                            <p className="text-slate-500 text-xs font-medium mb-6">Check your inbox for further instructions.</p>
                        </div>
                    )}

                    <div className="mt-8 text-center opacity-50">
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">SurfBill Security</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PasswordResetRequest;
