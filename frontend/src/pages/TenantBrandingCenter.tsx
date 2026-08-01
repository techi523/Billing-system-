import { useState, useEffect } from 'react';
import {
    Palette, Image as ImageIcon, Type, Layout, Globe, Phone, Save, RotateCcw,
    Monitor, Tablet, Smartphone, Sparkles, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface BrandingState {
    businessName: string;
    tagline: string;
    description: string;
    supportPhone: string;
    supportEmail: string;
    whatsappNumber: string;
    websiteUrl: string;
    physicalAddress: string;

    primaryLogoUrl: string;
    mobileLogoUrl: string;
    darkModeLogoUrl: string;
    lightModeLogoUrl: string;
    faviconUrl: string;
    footerLogoUrl: string;

    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    buttonColor: string;
    navColor: string;
    backgroundColor: string;
    footerColor: string;
    textColor: string;
    linkColor: string;

    welcomeMessage: string;
    headline: string;
    subheadline: string;
    termsConditions: string;
    privacyNotice: string;
    footerText: string;

    backgroundType: 'IMAGE' | 'VIDEO' | 'GRADIENT' | 'SOLID';
    backgroundUrl: string;
    gradientStartColor: string;
    gradientEndColor: string;
    backgroundBlur: number;
    backgroundOverlayOpacity: number;

    customDomain: string;
}

const defaultState: BrandingState = {
    businessName: 'Apex Fiber ISP',
    tagline: 'High-Speed Wi-Fi Access',
    description: 'Enterprise ISP & Hotspot Provider',
    supportPhone: '0714498996',
    supportEmail: 'support@apexfiber.co.ke',
    whatsappNumber: '254714498996',
    websiteUrl: 'https://apexfiber.co.ke',
    physicalAddress: 'Nairobi, Kenya',

    primaryLogoUrl: '',
    mobileLogoUrl: '',
    darkModeLogoUrl: '',
    lightModeLogoUrl: '',
    faviconUrl: '',
    footerLogoUrl: '',

    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',
    buttonColor: '#0284c7',
    navColor: '#0284c7',
    backgroundColor: '#0f172a',
    footerColor: '#0284c7',
    textColor: '#ffffff',
    linkColor: '#38bdf8',

    welcomeMessage: 'Select an internet package below for instant network access.',
    headline: 'Apex Fiber High-Speed Wi-Fi',
    subheadline: 'Instant M-Pesa Activation',
    termsConditions: 'Standard fair usage policies apply.',
    privacyNotice: 'Your privacy is protected.',
    footerText: '© 2026 Apex Fiber ISP. All rights reserved.',

    backgroundType: 'GRADIENT',
    backgroundUrl: '',
    gradientStartColor: '#0f172a',
    gradientEndColor: '#0284c7',
    backgroundBlur: 0,
    backgroundOverlayOpacity: 0.2,

    customDomain: 'wifi.apexfiber.co.ke'
};

const TenantBrandingCenter = () => {
    const [branding, setBranding] = useState<BrandingState>(defaultState);
    const [activeTab, setActiveTab] = useState<'IDENTITY' | 'LOGOS' | 'COLORS' | 'MESSAGES' | 'BACKGROUND' | 'DOMAIN'>('IDENTITY');
    const [previewDevice, setPreviewDevice] = useState<'DESKTOP' | 'TABLET' | 'MOBILE'>('DESKTOP');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await axios.get('/api/v1/branding/tenant/my-tenant');
                if (res.data) {
                    setBranding((prev) => ({ ...prev, ...res.data }));
                }
            } catch (_) {
                // Fallback to default state on error
            } finally {
                setLoading(false);
            }
        };
        fetchBranding();
    }, []);

    const handleChange = (field: keyof BrandingState, value: any) => {
        setBranding((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await axios.put('/api/v1/branding/tenant', branding);
            setFeedback({ type: 'success', message: 'Captive Portal branding saved & published successfully!' });
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to save branding settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Reset all captive portal branding to system defaults?')) return;
        setSaving(true);
        try {
            await axios.post('/api/v1/branding/tenant/reset');
            setBranding(defaultState);
            setFeedback({ type: 'success', message: 'Branding reset to system defaults.' });
        } catch (err: any) {
            setFeedback({ type: 'error', message: 'Failed to reset branding.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-white text-center font-bold">
                Loading Captive Portal Branding Engine...
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Sparkles className="w-7 h-7 text-sky-400" /> Captive Portal Branding Center
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Customize your captive portal branding, colors, logos, and messages independently.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        disabled={saving}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" /> Reset Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Publish'}
                    </button>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Split Screen: Editor Tabs (Left 7 Cols) + Real-Time Live Preview (Right 5 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Section: Settings Editor */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                    
                    {/* Tabs */}
                    <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold no-scrollbar">
                        {[
                            { id: 'IDENTITY', label: 'Identity', icon: Globe },
                            { id: 'LOGOS', label: 'Logos', icon: ImageIcon },
                            { id: 'COLORS', label: 'Colors', icon: Palette },
                            { id: 'MESSAGES', label: 'Messaging', icon: Type },
                            { id: 'BACKGROUND', label: 'Background', icon: Layout },
                            { id: 'DOMAIN', label: 'Domain', icon: Phone },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${isActive ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Icon className="w-3.5 h-3.5" /> {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab 1: Business Identity & Contact Info */}
                    {activeTab === 'IDENTITY' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Business Identity & Contact Profile</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Business Name</label>
                                    <input
                                        type="text"
                                        value={branding.businessName}
                                        onChange={(e) => handleChange('businessName', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tagline</label>
                                    <input
                                        type="text"
                                        value={branding.tagline}
                                        onChange={(e) => handleChange('tagline', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Support Phone</label>
                                    <input
                                        type="text"
                                        value={branding.supportPhone}
                                        onChange={(e) => handleChange('supportPhone', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Support Email</label>
                                    <input
                                        type="email"
                                        value={branding.supportEmail}
                                        onChange={(e) => handleChange('supportEmail', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp Support Number</label>
                                    <input
                                        type="text"
                                        value={branding.whatsappNumber}
                                        onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Website URL</label>
                                    <input
                                        type="text"
                                        value={branding.websiteUrl}
                                        onChange={(e) => handleChange('websiteUrl', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Logo Asset Management */}
                    {activeTab === 'LOGOS' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Logo & Brand Asset URLs</h3>
                            
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Portal Logo URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://cdn.example.com/logo.png"
                                        value={branding.primaryLogoUrl}
                                        onChange={(e) => handleChange('primaryLogoUrl', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mobile Header Logo URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://cdn.example.com/mobile-logo.png"
                                        value={branding.mobileLogoUrl}
                                        onChange={(e) => handleChange('mobileLogoUrl', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Favicon Icon URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://cdn.example.com/favicon.ico"
                                        value={branding.faviconUrl}
                                        onChange={(e) => handleChange('faviconUrl', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Color Customization */}
                    {activeTab === 'COLORS' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Color Palette Customization</h3>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={branding.primaryColor}
                                            onChange={(e) => handleChange('primaryColor', e.target.value)}
                                            className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                                        />
                                        <span className="text-xs font-mono text-white">{branding.primaryColor}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Button Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={branding.buttonColor}
                                            onChange={(e) => handleChange('buttonColor', e.target.value)}
                                            className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                                        />
                                        <span className="text-xs font-mono text-white">{branding.buttonColor}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Accent Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={branding.accentColor}
                                            onChange={(e) => handleChange('accentColor', e.target.value)}
                                            className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                                        />
                                        <span className="text-xs font-mono text-white">{branding.accentColor}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Messages & Copy */}
                    {activeTab === 'MESSAGES' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Custom Text & Messages</h3>
                            
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Portal Headline</label>
                                    <input
                                        type="text"
                                        value={branding.headline}
                                        onChange={(e) => handleChange('headline', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Welcome Message</label>
                                    <textarea
                                        rows={2}
                                        value={branding.welcomeMessage}
                                        onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Terms & Conditions Summary</label>
                                    <textarea
                                        rows={2}
                                        value={branding.termsConditions}
                                        onChange={(e) => handleChange('termsConditions', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Background Styling */}
                    {activeTab === 'BACKGROUND' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Background Type & Style</h3>
                            
                            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
                                {['GRADIENT', 'IMAGE', 'SOLID'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleChange('backgroundType', type)}
                                        className={`flex-1 py-2 rounded-xl transition ${branding.backgroundType === type ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {branding.backgroundType === 'IMAGE' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Background Image URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://images.unsplash.com/photo-..."
                                        value={branding.backgroundUrl}
                                        onChange={(e) => handleChange('backgroundUrl', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                    />
                                </div>
                            )}

                            {branding.backgroundType === 'GRADIENT' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Start Color</label>
                                        <input
                                            type="color"
                                            value={branding.gradientStartColor}
                                            onChange={(e) => handleChange('gradientStartColor', e.target.value)}
                                            className="w-full h-10 rounded border-none cursor-pointer bg-slate-950"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">End Color</label>
                                        <input
                                            type="color"
                                            value={branding.gradientEndColor}
                                            onChange={(e) => handleChange('gradientEndColor', e.target.value)}
                                            className="w-full h-10 rounded border-none cursor-pointer bg-slate-950"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 6: Custom Domain */}
                    {activeTab === 'DOMAIN' && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Custom Portal Domain Settings</h3>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Custom Domain (CNAME)</label>
                                <input
                                    type="text"
                                    placeholder="wifi.yourdomain.com"
                                    value={branding.customDomain}
                                    onChange={(e) => handleChange('customDomain', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                                />
                                <p className="text-[11px] text-slate-400 pt-1">
                                    Point your domain's CNAME record to <code>cname.surfbill.com</code> for automatic SSL resolution.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Section: Real-Time Live Multi-Device Preview Container */}
                <div className="lg:col-span-5 space-y-4 sticky top-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Eye className="w-4 h-4 text-sky-400" /> Live Portal Preview
                        </span>
                        
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                            <button
                                onClick={() => setPreviewDevice('DESKTOP')}
                                className={`p-1.5 rounded-lg transition ${previewDevice === 'DESKTOP' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
                                title="Desktop View"
                            >
                                <Monitor size={16} />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('TABLET')}
                                className={`p-1.5 rounded-lg transition ${previewDevice === 'TABLET' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
                                title="Tablet View"
                            >
                                <Tablet size={16} />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('MOBILE')}
                                className={`p-1.5 rounded-lg transition ${previewDevice === 'MOBILE' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
                                title="Mobile View"
                            >
                                <Smartphone size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Rendered Mockup Container */}
                    <div className={`mx-auto transition-all duration-500 overflow-hidden border border-slate-800 rounded-3xl shadow-2xl ${previewDevice === 'MOBILE' ? 'w-[320px] h-[520px]' : previewDevice === 'TABLET' ? 'w-[420px] h-[540px]' : 'w-full h-[540px]'}`}>
                        <div
                            className="w-full h-full p-4 overflow-y-auto space-y-4 text-white text-center flex flex-col justify-between"
                            style={{
                                background: branding.backgroundType === 'GRADIENT' 
                                    ? `linear-gradient(to bottom, ${branding.gradientStartColor}, ${branding.gradientEndColor})`
                                    : branding.backgroundColor
                            }}
                        >
                            <div className="space-y-2">
                                <div className="w-10 h-10 rounded-full mx-auto bg-white/10 flex items-center justify-center font-black text-sm">
                                    {branding.businessName.charAt(0)}
                                </div>
                                <h4 className="text-sm font-black tracking-tight">{branding.headline}</h4>
                                <p className="text-[10px] text-slate-300">{branding.welcomeMessage}</p>
                            </div>

                            {/* Package Card Preview */}
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span>24 Hours Unlimited</span>
                                    <span style={{ color: branding.primaryColor }}>KES 100</span>
                                </div>
                                <div className="text-[10px] text-slate-400">20 Mbps • Unlimited Data</div>
                                <button
                                    className="w-full py-2 text-[10px] font-black uppercase rounded-lg text-slate-950 transition"
                                    style={{ backgroundColor: branding.buttonColor || branding.primaryColor }}
                                >
                                    Select & Pay
                                </button>
                            </div>

                            {/* Footer Preview */}
                            <div className="text-[9px] text-slate-400 border-t border-white/10 pt-2">
                                {branding.footerText}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TenantBrandingCenter;
