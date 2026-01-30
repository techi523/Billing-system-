import React from 'react';
import { MessageCircle, Phone, Mail } from 'lucide-react';
import { OFFICIAL_SUPPORT } from '../../constants';

const SupportFooter: React.FC = () => {
    return (
        <footer className="w-full py-10 px-6 bg-slate-50 border-t border-slate-200">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h3 className="text-xl font-black text-indigo-600 mb-1 tracking-tighter">{OFFICIAL_SUPPORT.companyName} Support</h3>
                    <p className="text-sm font-medium text-slate-500 max-w-xs">
                        Production-grade WiFi billing and Scaling solutions. Our technical team is available 24/7 for hotspot owners & ISPs.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    <a href={OFFICIAL_SUPPORT.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group transition-all">
                        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all transform group-hover:-translate-y-1">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 tracking-tight">{OFFICIAL_SUPPORT.whatsapp}</span>
                    </a>

                    <a href={`tel:${OFFICIAL_SUPPORT.phone}`} className="flex flex-col items-center gap-2 group transition-all">
                        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:-translate-y-1">
                            <Phone className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 tracking-tight">{OFFICIAL_SUPPORT.phone}</span>
                    </a>

                    <a href={OFFICIAL_SUPPORT.emailMailto} className="flex flex-col items-center gap-2 group transition-all">
                        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all transform group-hover:-translate-y-1">
                            <Mail className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 tracking-tight">{OFFICIAL_SUPPORT.email}</span>
                    </a>
                </div>

                <div className="flex flex-col items-center md:items-end text-center md:text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Platform Status</p>
                    <div className="flex gap-4 items-center">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                            Secure
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            Reliable
                        </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 mt-4">© {new Date().getFullYear()} {OFFICIAL_SUPPORT.companyName}. Scaled for Kenya.</p>
                </div>
            </div>
        </footer>
    );
};

export default SupportFooter;
