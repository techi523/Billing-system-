import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';

const ImpersonationBanner: React.FC = () => {
    const { isImpersonating, impersonatedTenantName, stopImpersonation } = useAuth();
    const navigate = useNavigate();

    if (!isImpersonating) return null;

    const handleExit = () => {
        stopImpersonation();
        navigate('/platform-owner');
    };

    return (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2.5 shadow-xl border-b border-amber-400/30 sticky top-0 z-[100] flex items-center justify-between transition-all">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-black/20 rounded-lg backdrop-blur-sm animate-pulse">
                    <ShieldAlert size={18} className="text-amber-200" />
                </div>
                <div className="text-sm font-bold flex items-center gap-2">
                    <span className="bg-black/30 px-2 py-0.5 rounded text-xs tracking-wider uppercase font-mono font-black text-amber-200">
                        IMPERSONATION ACTIVE
                    </span>
                    <span>Viewing tenant workspace for:</span>
                    <span className="font-extrabold text-amber-100 underline decoration-amber-300 underline-offset-2">
                        {impersonatedTenantName || 'Tenant Account'}
                    </span>
                </div>
            </div>

            <button
                onClick={handleExit}
                className="flex items-center gap-2 bg-black/40 hover:bg-black/60 text-amber-100 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all border border-amber-300/30 shadow-sm hover:scale-105 active:scale-95"
            >
                <LogOut size={14} />
                Exit Impersonation & Return to Platform Owner
            </button>
        </div>
    );
};

export default ImpersonationBanner;
