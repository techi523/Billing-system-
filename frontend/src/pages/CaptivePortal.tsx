import { useState, useEffect } from 'react';
import {
    Wifi, Clock, Zap, ShieldCheck, CheckCircle2, AlertTriangle,
    Smartphone, Lock, RefreshCw, Key, HelpCircle, Sparkles, X, Info
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import SurfBillLogo from '../components/Common/SurfBillLogo';
import SupportFooter from '../components/Common/SupportFooter';

import type { Package } from '../types';

interface TenantConfig {
    id: string;
    name: string;
    logo?: string;
    logoUrl?: string;
    primaryColor?: string;
    contactPhone?: string;
    supportPhone?: string;
    supportEmail?: string;
    termsUrl?: string;
    subdomain?: string;
    welcomeMessage?: string;
    backgroundUrl?: string;
}

interface AdItem {
    id: string;
    headline?: string;
    subheading?: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'GIF';
    destinationUrl?: string;
    buttonText?: string;
    placement?: 'TOP_BANNER' | 'SIDE_BANNER' | 'BOTTOM_BANNER' | 'SPONSORED_SECTION';
}

const CaptivePortal = () => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [activeTab, setActiveTab] = useState<'MPESA' | 'VOUCHER' | 'TRIAL'>('MPESA');
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'waiting_pin' | 'success' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
    
    // Ad Placement Slots
    const [topAds, setTopAds] = useState<AdItem[]>([]);
    const [sideAds, setSideAds] = useState<AdItem[]>([]);
    const [bottomAds, setBottomAds] = useState<AdItem[]>([]);
    const [sponsoredAds, setSponsoredAds] = useState<AdItem[]>([]);

    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
    const [couponMsg, setCouponMsg] = useState('');

    useEffect(() => {
        const initPortal = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantId = urlParams.get('tenantId') || 'demo-tenant';

            try {
                // 1. Fetch Tenant Configuration & Isolated Captive Portal Branding
                const brandingRes = await axios.get(`/api/v1/branding/tenant/${tenantId}`).catch(() => ({ data: null }));
                if (brandingRes.data) {
                    setTenantConfig(brandingRes.data);
                } else {
                    const configRes = await axios.get(`/api/v1/portal/${tenantId}/config`).catch(() => ({ data: null }));
                    if (configRes.data) setTenantConfig(configRes.data);
                }

                // 2. Fetch Active Packages
                const pkgRes = await axios.get(`/api/v1/portal/${tenantId}/packages`).catch(() => ({ data: [] }));
                const pkgData = Array.isArray(pkgRes.data) ? pkgRes.data : [];
                setPackages(pkgData);
                if (pkgData.length > 0) {
                    setSelectedPackage(pkgData[0]);
                }

                // 3. Fetch Advertisements (Non-blocking)
                const deviceType = window.innerWidth >= 1024 ? 'DESKTOP' : window.innerWidth >= 768 ? 'TABLET' : 'MOBILE';
                axios.get(`/api/v1/portal/${tenantId}/ads?deviceType=${deviceType}`)
                    .then(adRes => {
                        if (Array.isArray(adRes.data) && adRes.data.length > 0) {
                            const allAds: AdItem[] = adRes.data;
                            setTopAds(allAds.filter(a => a.placement === 'TOP_BANNER' || !a.placement));
                            setSideAds(allAds.filter(a => a.placement === 'SIDE_BANNER'));
                            setBottomAds(allAds.filter(a => a.placement === 'BOTTOM_BANNER'));
                            setSponsoredAds(allAds.filter(a => a.placement === 'SPONSORED_SECTION'));

                            // Log Impression for first ad
                            if (allAds[0]?.id) {
                                axios.post(`/api/v1/portal/ads/${allAds[0].id}/track`, {
                                    tenantId,
                                    eventType: 'IMPRESSION',
                                    deviceType
                                }).catch(() => {});
                            }
                        }
                    })
                    .catch(() => {});

                setLoading(false);
            } catch {
                setErrorMessage('Failed to connect to network portal services');
                setLoading(false);
            }
        };
        initPortal();
    }, []);

    const handleVerifyCoupon = async () => {
        if (!couponInput.trim()) return;
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantId = urlParams.get('tenantId') || 'demo-tenant';
            const res = await axios.post(`/api/v1/portal/${tenantId}/verify-coupon`, { couponCode: couponInput });
            if (res.data.valid) {
                setAppliedCoupon(res.data);
                setCouponMsg(res.data.message);
            } else {
                setAppliedCoupon(null);
                setCouponMsg(res.data.message || 'Invalid promo code');
            }
        } catch (e: any) {
            setAppliedCoupon(null);
            setCouponMsg(e.response?.data?.message || 'Invalid promo code');
        }
    };

    const handleMpesaPayment = async () => {
        if (!selectedPackage || !phoneNumber) {
            setErrorMessage('Please select a package and enter your M-Pesa phone number');
            return;
        }

        setPaymentStatus('processing');
        setErrorMessage('');

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantId = urlParams.get('tenantId') || 'demo-tenant';
            const mac = urlParams.get('mac') || urlParams.get('client_mac') || '00:00:00:00:00:00';
            const ip = urlParams.get('ip') || urlParams.get('client_ip') || '127.0.0.1';
            let routerId = urlParams.get('routerId') || undefined;
            if (routerId === 'unknown') routerId = undefined;

            const response = await axios.post(`/api/v1/portal/${tenantId}/pay`, {
                phone: phoneNumber.replace(/^0/, '254').replace(/^\+/, ''),
                packageId: selectedPackage.id,
                mac,
                ip,
                routerId,
                linkLogin: urlParams.get('link-login'),
                linkOrig: urlParams.get('link-orig') || urlParams.get('dst')
            });

            setPaymentStatus('waiting_pin');
            pollPaymentStatus(response.data.paymentId);
        } catch (error: any) {
            setPaymentStatus('failed');
            setErrorMessage(error.response?.data?.error || 'Payment initiation failed. Please check network.');
        }
    };

    const handleVoucherLogin = async () => {
        if (!voucherCode) {
            setErrorMessage('Please enter your pre-paid voucher code');
            return;
        }

        setPaymentStatus('processing');
        setErrorMessage('');

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantId = urlParams.get('tenantId') || 'demo-tenant';
            const res = await axios.post(`/api/v1/portal/${tenantId}/redeem-voucher`, { voucherCode });
            if (res.data?.success) {
                setPaymentStatus('success');
                setTimeout(() => {
                    window.location.href = res.data?.redirectUrl || 'https://www.google.com';
                }, 2000);
            } else {
                setPaymentStatus('failed');
                setErrorMessage(res.data?.message || 'Voucher invalid or already used.');
            }
        } catch (err: any) {
            setPaymentStatus('failed');
            setErrorMessage(err.response?.data?.error || 'Voucher authentication failed.');
        }
    };

    const handleFreeTrialLogin = async () => {
        setPaymentStatus('processing');
        setErrorMessage('');
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tenantId = urlParams.get('tenantId') || 'demo-tenant';
            const res = await axios.post(`/api/v1/portal/${tenantId}/free-trial`, {
                mac: urlParams.get('mac') || '00:00:00:00:00:00'
            });
            if (res.data?.success) {
                setPaymentStatus('success');
                setTimeout(() => {
                    window.location.href = res.data?.redirectUrl || 'https://www.google.com';
                }, 2000);
            } else {
                setPaymentStatus('failed');
                setErrorMessage(res.data?.message || 'Free trial unavailable or limit reached.');
            }
        } catch (err: any) {
            setPaymentStatus('failed');
            setErrorMessage(err.response?.data?.error || 'Free trial access failed.');
        }
    };

    const pollPaymentStatus = async (currentPaymentId: string) => {
        let attempts = 0;
        const maxAttempts = 60;

        const pollInterval = setInterval(async () => {
            attempts++;
            try {
                const response = await axios.get(`/api/v1/portal/payment-status/${currentPaymentId}`);
                const status = response.data.status;

                if (status === 'SUCCESS') {
                    clearInterval(pollInterval);
                    setPaymentStatus('success');

                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const linkLogin = urlParams.get('link-login');
                        const linkOrig = urlParams.get('link-orig') || urlParams.get('dst') || 'https://www.google.com';
                        const username = `HS-${(urlParams.get('mac') || '00:00:00:00:00:00').replace(/[: -]/g, '').toUpperCase()}`;

                        if (linkLogin) {
                            const loginUrl = new URL(linkLogin);
                            loginUrl.searchParams.set('username', username);
                            loginUrl.searchParams.set('password', 'guest');
                            loginUrl.searchParams.set('dst', linkOrig);
                            window.location.href = loginUrl.toString();
                        } else {
                            window.location.href = linkOrig;
                        }
                    }, 3000);
                } else if (status === 'FAILED') {
                    clearInterval(pollInterval);
                    setPaymentStatus('failed');
                    setErrorMessage(response.data.failureReason || 'Payment declined or cancelled.');
                } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    setPaymentStatus('failed');
                    setErrorMessage('Payment request timed out. Please try again.');
                }
            } catch (_) {}
        }, 3000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 bg-sky-500/20 rounded-3xl border border-sky-500/30 flex items-center justify-center shadow-2xl mb-4"
                >
                    <Wifi size={32} className="text-sky-400" />
                </motion.div>
                <h2 className="text-xl font-black tracking-tight">{tenantConfig?.name || 'SurfBill'} Captive Portal</h2>
                <p className="text-xs text-sky-400 font-bold uppercase tracking-widest mt-2 animate-pulse">Initializing Network Access...</p>
            </div>
        );
    }

    const primaryColor = tenantConfig?.primaryColor || '#0284c7';

    return (
        <div
            className="min-h-screen bg-slate-950 text-white font-sans selection:bg-sky-500 relative overflow-x-hidden"
            style={{ '--tenant-primary': primaryColor } as any}
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-8 relative z-10">

                {/* 1. Header & Tenant Branding */}
                <header className="flex flex-col items-center text-center space-y-3">
                    <div className="flex justify-center mb-1">
                        {tenantConfig?.logoUrl ? (
                            <img src={tenantConfig.logoUrl} alt="Logo" className="h-14 sm:h-16 object-contain" />
                        ) : (
                            <SurfBillLogo variant="captive" size="lg" showText={false} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                            {tenantConfig?.name || 'SurfBill'} <span className="text-sky-400">High-Speed Wi-Fi</span>
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1">
                            {tenantConfig?.welcomeMessage || 'Select an internet package below for instant network access.'}
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Hotspot Online & Ready
                    </div>
                </header>

                {/* 2. Top Banner Advertisement Slot (Allowed Area: Isolated from package buttons) */}
                {topAds.length > 0 && (
                    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-[9px] font-black uppercase rounded">Sponsored</span>
                            <div>
                                <h4 className="text-xs font-bold text-white">{topAds[0].headline || 'Special Partner Promotion'}</h4>
                                <p className="text-[11px] text-slate-400">{topAds[0].subheading || 'Enjoy high-speed streaming on SurfBill Hotspot.'}</p>
                            </div>
                        </div>
                        {topAds[0].destinationUrl && (
                            <a
                                href={topAds[0].destinationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition shrink-0"
                            >
                                {topAds[0].buttonText || 'Learn More'}
                            </a>
                        )}
                    </div>
                )}

                {/* 3. Main Grid Layout (Desktop: Side Ad + Main Content, Mobile: Stacked Single Column) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    
                    {/* Left 3 Columns: Packages Display Matrix */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-sky-400" /> Internet Packages
                                </h2>
                                <p className="text-xs text-slate-400">Choose a package tailored for your data and speed needs</p>
                            </div>
                            <span className="text-xs font-bold text-slate-500">{packages.length} Packages Available</span>
                        </div>

                        {/* Responsive Package Grid (Desktop 3-col, Tablet 2-col, Mobile 1-col) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {packages.map((pkg, idx) => {
                                const isSelected = selectedPackage?.id === pkg.id;
                                const isPopular = idx === 1 || (pkg as any).isPopular;
                                const isRecommended = idx === 0;

                                return (
                                    <motion.div
                                        key={pkg.id}
                                        whileHover={{ y: -4 }}
                                        onClick={() => setSelectedPackage(pkg)}
                                        className={`p-5 rounded-3xl border cursor-pointer transition-all duration-300 relative flex flex-col justify-between overflow-hidden ${isSelected ? 'bg-sky-950/60 border-sky-500 shadow-xl shadow-sky-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        {/* Badges */}
                                        <div className="flex items-center justify-between mb-3">
                                            {isPopular ? (
                                                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-black uppercase rounded-full">
                                                    Popular Choice
                                                </span>
                                            ) : isRecommended ? (
                                                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase rounded-full">
                                                    Recommended
                                                </span>
                                            ) : <div />}

                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />}
                                        </div>

                                        {/* Package Content */}
                                        <div className="space-y-2 mb-4">
                                            <h3 className="text-base font-black text-white">{pkg.name}</h3>
                                            <p className="text-2xl font-black text-white">
                                                KES {pkg.price} <span className="text-xs text-slate-400 font-normal">/ {(pkg.durationMinutes || 60) >= 1440 ? `${Math.round((pkg.durationMinutes || 1440) / 1440)} Days` : `${Math.round((pkg.durationMinutes || 60) / 60)} Hrs`}</span>
                                            </p>

                                            <div className="space-y-1 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Speed Limit:</span>
                                                    <strong className="text-sky-400 font-bold">{pkg.speedLimit || '10 Mbps'}</strong>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500">Data Volume:</span>
                                                    <strong className="text-white font-bold">{pkg.dataLimitBytes ? `${Math.round(pkg.dataLimitBytes / (1024 * 1024 * 1024))} GB` : 'Unlimited Data'}</strong>
                                                </div>
                                            </div>

                                            {pkg.description && (
                                                <p className="text-[11px] text-slate-400 line-clamp-2 pt-1">{pkg.description}</p>
                                            )}
                                        </div>

                                        {/* Select Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPackage(pkg);
                                            }}
                                            className={`w-full py-2.5 min-h-[44px] text-xs font-black uppercase tracking-wider rounded-xl transition ${isSelected ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                        >
                                            {isSelected ? 'Selected' : 'Select Package'}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right 1 Column: Login & Purchase Action Box + Side Ads */}
                    <div className="space-y-6">
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6">
                            
                            {/* Tab Selection: M-Pesa vs Voucher vs Free Trial */}
                            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
                                <button
                                    onClick={() => setActiveTab('MPESA')}
                                    className={`flex-1 py-2 rounded-xl transition ${activeTab === 'MPESA' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'}`}
                                >
                                    M-Pesa STK
                                </button>
                                <button
                                    onClick={() => setActiveTab('VOUCHER')}
                                    className={`flex-1 py-2 rounded-xl transition ${activeTab === 'VOUCHER' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'}`}
                                >
                                    Voucher
                                </button>
                                <button
                                    onClick={() => setActiveTab('TRIAL')}
                                    className={`flex-1 py-2 rounded-xl transition ${activeTab === 'TRIAL' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'}`}
                                >
                                    Free Trial
                                </button>
                            </div>

                            {/* Tab 1: M-Pesa Payment */}
                            {activeTab === 'MPESA' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1 text-xs">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Selected Package:</span>
                                            <strong className="text-white">{selectedPackage?.name || 'Select a package'}</strong>
                                        </div>
                                        <div className="flex justify-between text-slate-400">
                                            <span>Price:</span>
                                            <strong className="text-emerald-400 font-bold">KES {selectedPackage?.price || 0}</strong>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                                        <div className="relative">
                                            <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="tel"
                                                placeholder="0712345678 or 2547..."
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Promo Code Expandable */}
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Promo Coupon Code"
                                                value={couponInput}
                                                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs uppercase"
                                            />
                                            <button
                                                onClick={handleVerifyCoupon}
                                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        {couponMsg && (
                                            <p className={`text-[11px] ${appliedCoupon ? 'text-emerald-400' : 'text-amber-400'}`}>{couponMsg}</p>
                                        )}
                                    </div>

                                    {errorMessage && (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                                            {errorMessage}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleMpesaPayment}
                                        disabled={paymentStatus !== 'idle'}
                                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                                    >
                                        {paymentStatus === 'processing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        Pay & Connect Now
                                    </button>
                                </div>
                            )}

                            {/* Tab 2: Voucher Login */}
                            {activeTab === 'VOUCHER' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pre-paid Voucher Code</label>
                                        <div className="relative">
                                            <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="Enter 8-digit voucher code"
                                                value={voucherCode}
                                                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-sky-500 uppercase"
                                            />
                                        </div>
                                    </div>

                                    {errorMessage && (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                                            {errorMessage}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleVoucherLogin}
                                        className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]"
                                    >
                                        Redeem Voucher & Connect
                                    </button>
                                </div>
                            )}

                            {/* Tab 3: Free Trial Access */}
                            {activeTab === 'TRIAL' && (
                                <div className="space-y-4 text-center">
                                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1 text-xs text-left">
                                        <p className="font-bold text-white">Free Guest Trial Access</p>
                                        <p className="text-slate-400 text-[11px]">Get 10 minutes of complimentary high-speed internet access.</p>
                                    </div>

                                    <button
                                        onClick={handleFreeTrialLogin}
                                        className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]"
                                    >
                                        <Sparkles className="w-4 h-4" /> Activate Free 10-Min Trial
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Side Banner Slot (Desktop Viewport) */}
                        {sideAds.length > 0 && (
                            <div className="hidden lg:block p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                                <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-[9px] font-black uppercase rounded">Featured Partner</span>
                                {sideAds[0].mediaUrl && (
                                    <img src={sideAds[0].mediaUrl} alt="Ad" className="w-full h-32 object-cover rounded-xl" />
                                )}
                                <h4 className="text-xs font-bold text-white">{sideAds[0].headline || 'Partner Promotion'}</h4>
                                {sideAds[0].destinationUrl && (
                                    <a
                                        href={sideAds[0].destinationUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-slate-300 rounded-xl transition"
                                    >
                                        {sideAds[0].buttonText || 'Visit Partner'}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Support & Terms Footer */}
                <footer className="pt-8 border-t border-slate-900">
                    <SupportFooter />
                </footer>
            </div>
        </div>
    );
};

export default CaptivePortal;
