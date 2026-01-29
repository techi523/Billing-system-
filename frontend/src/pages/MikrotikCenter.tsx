import React, { useState } from 'react';
import {
    Download,
    Terminal,
    FileText,
    Cpu,
    Settings,
    Info,
    CheckCircle,
    ChevronRight,
    Wifi,
    Globe,
    Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import SupportFooter from '../components/Common/SupportFooter';

const MikrotikCenter: React.FC = () => {
    const [downloading, setDownloading] = useState<string | null>(null);

    const downloadScript = async (type: string, version: string) => {
        setDownloading(`${type}-${version}`);
        try {
            const response = await axios.get(`/api/v1/admin/mikrotik/generate-script?type=${type}&version=${version}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `surfbill_${type.toLowerCase()}_${version}.rsc`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to generate script. Please ensure your session is active.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-white/5 text-white px-8 py-10 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Terminal className="text-sky-400 w-8 h-8" />
                            <h1 className="text-4xl font-black tracking-tighter">MikroTik <span className="text-sky-400">Center</span></h1>
                        </div>
                        <p className="text-slate-400 font-bold text-lg max-w-xl">Production-ready scripts for RouterOS v6 and v7. Zero configuration, maximum efficiency.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-[2rem] border border-white/10">
                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Status</p>
                            <p className="text-sm font-bold">Standard Isolation Applied</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Script Selection */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Choose Your Architecture</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ScriptOption
                                    icon={<Wifi className="w-6 h-6" />}
                                    name="Hotspot Gateway"
                                    description="Complete captive portal setup with IP pools, NAT, and Walled Garden rules."
                                    onClick={(v) => downloadScript('HOTSPOT', v)}
                                    downloading={downloading?.startsWith('HOTSPOT')}
                                />
                                <ScriptOption
                                    icon={<Globe className="w-6 h-6" />}
                                    name="PPPoE Server"
                                    description="ISP-grade secret management with RADIUS integration for fiber/fixed-wireless."
                                    onClick={(v) => downloadScript('PPPOE', v)}
                                    downloading={downloading?.startsWith('PPPOE')}
                                />
                                <ScriptOption
                                    icon={<Cpu className="w-6 h-6" />}
                                    name="RADIUS Base"
                                    description="Standardized RADIUS configuration for centralized authentication."
                                    onClick={(v) => downloadScript('RADIUS', v)}
                                    downloading={downloading?.startsWith('RADIUS')}
                                />
                                <div className="p-8 rounded-[3rem] border border-dashed border-slate-300 flex flex-col items-center justify-center text-center opacity-60">
                                    <h3 className="font-black text-slate-900 mb-1">More Coming Soon</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custom Script Engine</p>
                                </div>
                            </div>
                        </div>

                        {/* Implementation Guide */}
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Deployment Guide</h2>
                            <div className="space-y-6">
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">1</div>
                                    <div>
                                        <h3 className="font-black text-slate-900 mb-1">Download & Preview</h3>
                                        <p className="text-sm text-slate-500 font-bold">Select the script version (v6/v7) matched to your RouterOS firmware.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">2</div>
                                    <div>
                                        <h3 className="font-black text-slate-900 mb-1">Winbox Terminal</h3>
                                        <p className="text-sm text-slate-500 font-bold">Open Winbox, navigate to New Terminal, and paste the content from your downloaded .rsc file.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">3</div>
                                    <div>
                                        <h3 className="font-black text-slate-900 mb-1">Verify Connection</h3>
                                        <p className="text-sm text-slate-500 font-bold">Check the Radius or Hotspot Status tabs to confirm your router is communicating with SurfBill.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats & Info */}
                    <div className="space-y-8">
                        <div className="bg-sky-500 rounded-[3rem] p-8 text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <Info className="w-6 h-6 text-sky-200" />
                                <h3 className="text-xl font-black tracking-tight">Version Matters</h3>
                            </div>
                            <p className="text-sm font-bold text-sky-100 leading-relaxed mb-6">
                                RouterOS v7 introduced a completely new routing stack. Ensure you select <strong>v7</strong> for hardware purchased after 2022.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/60">
                                    <CheckCircle className="w-4 h-4 text-white" /> IPv6 Ready
                                </div>
                                <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/60">
                                    <CheckCircle className="w-4 h-4 text-white" /> Zero-Trust Optimized
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm overflow-hidden relative">
                            <div className="absolute -bottom-10 -right-10 opacity-5">
                                <Settings className="w-40 h-40 animate-spin-slow" />
                            </div>
                            <h3 className="font-black text-slate-900 mb-4">Support & Scaling</h3>
                            <p className="text-xs text-slate-500 font-bold mb-6">Need help with custom routing or OSPF? Our enterprise engineers can help you scale.</p>
                            <button className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">
                                Contact Enterprise
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <SupportFooter />
        </div>
    );
};

const ScriptOption: React.FC<{ icon: React.ReactNode, name: string, description: string, onClick: (v: string) => void, downloading: boolean | undefined }> = ({ icon, name, description, onClick, downloading }) => {
    return (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:border-sky-500 transition-all group">
            <div className="p-4 bg-slate-50 text-slate-900 rounded-[1.5rem] mb-6 inline-block group-hover:bg-sky-500 group-hover:text-white transition-all">
                {icon}
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">{name}</h3>
            <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed">{description}</p>

            <div className="flex flex-col gap-3">
                <button
                    onClick={() => onClick('v7')}
                    disabled={downloading}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    {downloading ? 'Generating...' : 'ROS v7 Script'}
                    {!downloading && <ChevronRight className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => onClick('v6')}
                    disabled={downloading}
                    className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-200 disabled:opacity-50"
                >
                    {downloading ? 'Please wait...' : 'ROS v6 Legacy'}
                    {!downloading && <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

export default MikrotikCenter;
