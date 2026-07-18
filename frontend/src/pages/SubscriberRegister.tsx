import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Mail, Phone, User, Wifi, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/logo-main.png';
import SupportFooter from '../components/Common/SupportFooter';
import { OFFICIAL_SUPPORT } from '../constants';

interface Package {
    id: number;
    name: string;
    price: number;
    durationMinutes: number;
    type: string;
}

interface TenantConfig {
    id: string;
    name: string;
    logoUrl?: string;
    primaryColor?: string;
    subdomain?: string;
}

const SubscriberRegister = () => {
    const [searchParams] = useSearchParams();
    const tenantId = searchParams.get('tenantId');

    const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
    const [paymentPhone, setPaymentPhone] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<string>('idle');
    const [registeredSubscriberId, setRegisteredSubscriberId] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId) {
            setError('Invalid registration link. Please contact your network provider.');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [configRes, pkgRes] = await Promise.all([
                    axios.get(`/api/v1/portal/${tenantId}/config`),
                    axios.get(`/api/v1/portal/${tenantId}/packages`)
                ]);
                setTenantConfig(configRes.data);
                setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : []);
            } catch {
                setError('Failed to load network configuration. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tenantId]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPackage) {
            setError('Please select a package');
            return;
        }
        if (!phone || phone.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await axios.post(`/api/v1/portal/${tenantId}/register`, {
                name,
                phoneNumber: phone,
                email,
                packageId: selectedPackage
            });

            setRegisteredSubscriberId(res.data.subscriber.id);
            setPaymentPhone(phone.replace(/^0/, '254').replace(/^\+/, ''));
            setSuccess(true);
        } catch (err: unknown) {
            let errorMsg = 'Registration failed. Please try again.';
            if (axios.isAxiosError(err) && err.response?.data?.error) {
                errorMsg = err.response.data.error;
            }
            setError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePayment = async () => {
        if (!paymentPhone || !selectedPackage) return;

        setPaymentStatus('processing');
        setError('');

        try {
            const response = await axios.post(`/api/v1/portal/${tenantId}/pay`, {
                phone: paymentPhone,
                packageId: selectedPackage,
                subscriberId: registeredSubscriberId
            });

            setPaymentStatus('waiting_pin');
            pollPaymentStatus(response.data.paymentId);
        } catch (err: unknown) {
            setPaymentStatus('failed');
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Payment failed. Please try again.');
            } else {
                setError('Payment failed. Please try again.');
            }
        }
    };

    const pollPaymentStatus = async (currentPaymentId: string) => {
        let attempts = 0;
        const maxAttempts = 60;

        const pollInterval = setInterval(async () => {
            attempts++;
            try {
                const response = await axios.get(`/api/v1/portal/payment-status/${currentPaymentId}`);
                if (response.data.status === 'SUCCESS') {
                    clearInterval(pollInterval);
                    setPaymentStatus('success');
                } else if (response.data.status === 'FAILED') {
                    clearInterval(pollInterval);
                    setPaymentStatus('failed');
                    setError(response.data.failureReason || 'Payment was declined. Please try again.');
                } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setPaymentStatus('failed');
                    setError('Payment timed out. Please try again.');
                }
            } catch {
                // Silent catch
            }
        }, 3000);
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        if (minutes < 1440) return `${minutes / 60} hour${minutes > 60 ? 's' : ''}`;
        return `${minutes / 1440} day${minutes > 1440 ? 's' : ''}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center transition-colors duration-300">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--border-subtle)] border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)] font-bold">Loading...</p>
                </div>
            </div>
        );
    }

    if (error && !tenantId) {
        return (
            <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6 transition-colors duration-300">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-10 rounded-[3rem] text-center max-w-md w-full shadow-2xl">
                    <p className="text-rose-400 font-bold">{error}</p>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'success') {
        return (
            <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6 transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-10 rounded-[3rem] text-center max-w-md w-full shadow-2xl"
                >
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-emerald-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Payment Successful!</h2>
                    <p className="text-[var(--text-secondary)] font-medium mb-4">Your account is now active. Welcome to {tenantConfig?.name}!</p>
                    <p className="text-[var(--text-muted)] text-xs font-bold">You can now connect to the WiFi network using your credentials.</p>
                </motion.div>
            </div>
        );
    }

    if (success && paymentStatus !== 'success') {
        const pkg = packages.find(p => p.id === selectedPackage);
        return (
            <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6 transition-colors duration-300">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-10 rounded-[3rem] max-w-md w-full shadow-2xl"
                >
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="text-emerald-500" size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Account Created!</h2>
                        <p className="text-[var(--text-secondary)] text-sm font-medium">Complete payment to activate your internet access</p>
                    </div>

                    {pkg && (
                        <div className="bg-[var(--bg-surface-elevated)] rounded-2xl p-6 mb-6 border border-[var(--border-subtle)]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[var(--text-muted)] text-xs font-bold uppercase">Package</span>
                                <span className="text-[var(--text-primary)] font-black text-sm">{pkg.name}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[var(--text-muted)] text-xs font-bold uppercase">Duration</span>
                                <span className="text-[var(--text-primary)] font-bold text-sm">{formatDuration(pkg.durationMinutes)}</span>
                            </div>
                            <div className="border-t border-[var(--border-subtle)] mt-3 pt-3 flex justify-between items-center">
                                <span className="text-[var(--text-muted)] text-xs font-bold uppercase">Amount</span>
                                <span className="text-sky-500 font-black text-lg">KES {pkg.price}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">M-Pesa Phone Number</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                    <Phone size={16} />
                                </div>
                                <input
                                    type="tel"
                                    placeholder="0712345678"
                                    value={paymentPhone}
                                    onChange={(e) => setPaymentPhone(e.target.value)}
                                    className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-11 pr-4 text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:border-sky-500 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-3 rounded-xl border border-rose-500/20">
                                {error}
                            </div>
                        )}

                        {paymentStatus === 'waiting_pin' && (
                            <div className="text-sky-400 text-xs font-bold text-center bg-sky-500/10 py-3 rounded-xl border border-sky-500/20 flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Check your phone for the M-Pesa prompt and enter your PIN...
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePayment}
                            disabled={paymentStatus === 'processing' || paymentStatus === 'waiting_pin'}
                            className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-400 transition-colors disabled:opacity-50"
                        >
                            {paymentStatus === 'processing' || paymentStatus === 'waiting_pin' ? 'Processing...' : 'Pay Now'}
                            <CreditCard size={18} />
                        </motion.button>

                        <button
                            onClick={() => { setSuccess(false); setPaymentStatus('idle'); setError(''); }}
                            className="w-full text-[var(--text-muted)] text-xs font-bold py-2 hover:text-[var(--text-primary)] transition-colors"
                        >
                            Register a different account
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[60%] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-8 rounded-[3rem] shadow-2xl transition-colors">
                    <div className="text-center mb-8">
                        <img src={logo} alt="SurfBill" className="w-16 h-16 mx-auto mb-3" />
                        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Join {tenantConfig?.name || 'Network'}</h1>
                        <p className="text-[var(--text-secondary)] text-sm font-medium mt-2">Create your account to get connected</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-sky-500 transition-colors">
                                <User size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Full Name (optional)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-11 pr-4 text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:border-sky-500 transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-sky-500 transition-colors">
                                <Phone size={16} />
                            </div>
                            <input
                                type="tel"
                                required
                                placeholder="Phone Number (e.g. 0712345678)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-11 pr-4 text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:border-sky-500 transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-sky-500 transition-colors">
                                <Mail size={16} />
                            </div>
                            <input
                                type="email"
                                placeholder="Email (optional)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-11 pr-4 text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:border-sky-500 transition-all"
                            />
                        </div>

                        <div className="pt-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">Select Package</label>
                            <div className="space-y-2">
                                {packages.length === 0 ? (
                                    <p className="text-[var(--text-muted)] text-sm font-medium text-center py-4">No packages available</p>
                                ) : (
                                    packages.map((pkg) => (
                                        <button
                                            type="button"
                                            key={pkg.id}
                                            onClick={() => setSelectedPackage(pkg.id)}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                                selectedPackage === pkg.id
                                                    ? 'border-sky-500 bg-sky-500/10'
                                                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] hover:border-[var(--text-muted)]'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <Wifi size={16} className={selectedPackage === pkg.id ? 'text-sky-500' : 'text-[var(--text-muted)]'} />
                                                    <div>
                                                        <p className="text-[var(--text-primary)] font-black text-sm">{pkg.name}</p>
                                                        <p className="text-[var(--text-muted)] text-[10px] font-bold">{formatDuration(pkg.durationMinutes)}</p>
                                                    </div>
                                                </div>
                                                <span className="text-sky-500 font-black text-sm">KES {pkg.price}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 py-3 rounded-xl border border-rose-500/20">
                                {error}
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-400 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Creating Account...' : 'Register'}
                            {!submitting && <ArrowRight size={18} strokeWidth={3} />}
                        </motion.button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center">
                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2">Need Help?</p>
                        <a href={OFFICIAL_SUPPORT.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 text-xs font-bold transition-colors">
                            WhatsApp: {OFFICIAL_SUPPORT.whatsapp}
                        </a>
                    </div>
                </div>
            </motion.div>

            <div className="absolute bottom-0 left-0 w-full z-10 opacity-60 hover:opacity-100 transition-opacity">
                <SupportFooter />
            </div>
        </div>
    );
};

export default SubscriberRegister;
