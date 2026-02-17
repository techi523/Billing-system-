import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Shield, Globe, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import axios from 'axios';

interface PlatformSetting {
    key: string;
    value: string;
}

interface SettingsMap {
    [key: string]: string;
}

interface MessageState {
    type: 'success' | 'error' | 'info' | '';
    text: string;
}

interface TabConfig {
    id: string;
    label: string;
    icon: LucideIcon;
}

const PlatformSettings = () => {
    const [activeTab, setActiveTab] = useState('system');
    const [settings, setSettings] = useState<SettingsMap>({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<MessageState>({ type: '', text: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get<PlatformSetting[]>('/api/v1/superadmin/settings');
            const settingsMap = res.data.reduce((acc: SettingsMap, curr: PlatformSetting) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});
            setSettings(settingsMap);
        } catch (error: unknown) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string, value: string) => {
        try {
            await axios.put(`/api/v1/superadmin/settings/${key}`, { value });
            setSettings(prev => ({ ...prev, [key]: value }));
            setMessage({ type: 'success', text: `Setting ${key} updated successfully` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error: unknown) {
            console.error(`Failed to update ${key}`, error);
            setMessage({ type: 'error', text: `Failed to update ${key}` });
        }
    };

    const testSMTP = async () => {
        try {
            setMessage({ type: 'info', text: 'Sending test email...' });
            await axios.post('/api/v1/superadmin/test-email');
            setMessage({ type: 'success', text: 'Test email sent successfully!' });
        } catch (error: unknown) {
            let errorMsg = 'SMTP Test failed';
            if (axios.isAxiosError(error) && error.response?.data?.error) {
                errorMsg = error.response.data.error;
            }
            setMessage({ type: 'error', text: errorMsg });
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
            <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Loading Configurations...</p>
        </div>
    );

    const tabs: TabConfig[] = [
        { id: 'system', label: 'System', icon: Globe },
        { id: 'email', label: 'Email (SMTP)', icon: Mail },
        { id: 'sms', label: 'SMS & WhatsApp', icon: MessageSquare },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {message.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    message.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                        'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {message.text}
                </div>
            )}

            <div className="flex flex-wrap gap-2 p-2 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--border-subtle)] w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[2.5rem] p-10 shadow-xl min-h-[500px]">
                {activeTab === 'system' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-xl font-black text-[var(--text-primary)] mb-6">General Platform Identity</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase">Platform Name</label>
                                    <div className="flex gap-2">
                                        <input
                                            defaultValue={settings.PLATFORM_NAME || 'SurfBill Cloud'}
                                            onBlur={(e) => handleSave('PLATFORM_NAME', e.target.value)}
                                            className="flex-1 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase">Primary Domain</label>
                                    <input
                                        defaultValue={settings.PRIMARY_DOMAIN || 'surfbill.app'}
                                        onBlur={(e) => handleSave('PRIMARY_DOMAIN', e.target.value)}
                                        className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-[var(--text-muted)] uppercase">System Currency</label>
                                        <input
                                            defaultValue={settings.SYSTEM_CURRENCY || 'KES'}
                                            onBlur={(e) => handleSave('SYSTEM_CURRENCY', e.target.value)}
                                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-[var(--text-muted)] uppercase">Timezone</label>
                                        <select
                                            defaultValue={settings.SYSTEM_TIMEZONE || 'Africa/Nairobi'}
                                            onChange={(e) => handleSave('SYSTEM_TIMEZONE', e.target.value)}
                                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        >
                                            <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                                            <option value="UTC">UTC</option>
                                            <option value="Europe/London">Europe/London</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-[var(--text-primary)]">SMTP Relay Configuration</h3>
                                <button
                                    onClick={testSMTP}
                                    className="px-4 py-2 bg-sky-500/10 text-sky-500 rounded-xl font-bold text-xs hover:bg-sky-500 hover:text-white transition-all"
                                >
                                    Send Test Email
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-black text-[var(--text-muted)] uppercase">SMTP Host</label>
                                        <input
                                            defaultValue={settings.SMTP_HOST || 'smtp.gmail.com'}
                                            onBlur={(e) => handleSave('SMTP_HOST', e.target.value)}
                                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-[var(--text-muted)] uppercase">Port</label>
                                        <input
                                            defaultValue={settings.SMTP_PORT || '587'}
                                            onBlur={(e) => handleSave('SMTP_PORT', e.target.value)}
                                            className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase">Username / Email</label>
                                    <input
                                        defaultValue={settings.SMTP_USER || ''}
                                        onBlur={(e) => handleSave('SMTP_USER', e.target.value)}
                                        className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        placeholder="noreply@surfbill.app"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase">App Password</label>
                                    <input
                                        type="password"
                                        defaultValue={settings.SMTP_PASS || ''}
                                        onBlur={(e) => handleSave('SMTP_PASS', e.target.value)}
                                        className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                        placeholder="••••••••••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sms' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-xl font-black text-[var(--text-primary)] mb-6">Communication Gateways</h3>
                            <div className="space-y-6">
                                <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/20 space-y-4">
                                    <div className="flex items-center gap-3 text-amber-600 font-black text-sm">
                                        <MessageSquare size={18} />
                                        Africa's Talking (Primary)
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-amber-600/60 uppercase">API Username</label>
                                            <input
                                                defaultValue={settings.SMS_USERNAME || ''}
                                                onBlur={(e) => handleSave('SMS_USERNAME', e.target.value)}
                                                className="w-full bg-white/50 border border-amber-500/20 rounded-xl px-4 py-2 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-amber-600/60 uppercase">Sender ID</label>
                                            <input
                                                defaultValue={settings.SMS_SENDER_ID || ''}
                                                onBlur={(e) => handleSave('SMS_SENDER_ID', e.target.value)}
                                                className="w-full bg-white/50 border border-amber-500/20 rounded-xl px-4 py-2 outline-none focus:border-amber-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 space-y-4">
                                    <div className="flex items-center gap-3 text-emerald-600 font-black text-sm">
                                        <MessageSquare size={18} />
                                        Twilio WhatsApp (Business)
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-emerald-600/60 uppercase">Account SID</label>
                                            <input
                                                defaultValue={settings.TWILIO_SID || ''}
                                                onBlur={(e) => handleSave('TWILIO_SID', e.target.value)}
                                                className="w-full bg-white/50 border border-emerald-500/20 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-emerald-600/60 uppercase">WhastApp From Number</label>
                                            <input
                                                defaultValue={settings.TWILIO_WHATSAPP_FROM || ''}
                                                onBlur={(e) => handleSave('TWILIO_WHATSAPP_FROM', e.target.value)}
                                                className="w-full bg-white/50 border border-emerald-500/20 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 transition-all font-bold text-sm"
                                                placeholder="whatsapp:+14155238886"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-8 max-w-2xl">
                        <div>
                            <h3 className="text-xl font-black text-[var(--text-primary)] mb-6">System Hardening & Access</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase">Minimum Password Length</label>
                                    <input
                                        type="number"
                                        defaultValue={settings.SECURITY_MIN_PASSWORD || '8'}
                                        onBlur={(e) => handleSave('SECURITY_MIN_PASSWORD', e.target.value)}
                                        className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[var(--text-muted)] uppercase">Session Timeout (Minutes)</label>
                                    <input
                                        type="number"
                                        defaultValue={settings.SECURITY_SESSION_TIMEOUT || '60'}
                                        onBlur={(e) => handleSave('SECURITY_SESSION_TIMEOUT', e.target.value)}
                                        className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 outline-none focus:border-sky-500 transition-all font-bold"
                                    />
                                </div>
                                <div className="pt-6 flex items-center justify-between p-6 bg-sky-500/5 rounded-3xl border border-sky-500/20">
                                    <div>
                                        <p className="font-black text-sky-600">Force 2FA for Super Admins</p>
                                        <p className="text-xs font-bold text-sky-600/60">Require OTP from email on every login</p>
                                    </div>
                                    <button
                                        onClick={() => handleSave('FORCE_2FA', settings.FORCE_2FA === 'true' ? 'false' : 'true')}
                                        className={`w-12 h-6 rounded-full transition-all relative ${settings.FORCE_2FA === 'true' ? 'bg-sky-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.FORCE_2FA === 'true' ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="text-center opacity-60">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    All changes are recorded in the system audit logs.
                </p>
            </div>
        </div>
    );
};

export default PlatformSettings;
