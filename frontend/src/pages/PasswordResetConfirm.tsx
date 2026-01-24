import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/logo.png';

const PasswordResetConfirm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Missing or invalid reset token.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/api/v1/auth/password-reset/confirm', {
                token,
                newPassword: password
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password. Token may be expired.');
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
                        <CheckCircle className="text-emerald-400" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Password Updated!</h2>
                    <p className="text-slate-400 font-medium mb-6">Your security is our priority. You can now sign in with your new password.</p>
                    <motion.button
                        onClick={() => navigate('/login')}
                        className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl hover:bg-sky-400 transition-colors"
                    >
                        Return to Sign In
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-600/10 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
                    <div className="text-center mb-10">
                        <img src={logo} alt="SurfBill" className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-black text-white tracking-tight">Set New Password</h1>
                        <p className="text-slate-400 text-sm font-medium mt-2">Enter your strong new password below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    placeholder="New Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-semibold focus:outline-none focus:border-sky-500 focus:bg-slate-900/80 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-2 rounded-lg">{error}</p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading || !!error && !token}
                            className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-400 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Reset Password'}
                            {!loading && <ArrowRight size={18} strokeWidth={3} />}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default PasswordResetConfirm;
