import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, Package, Users, Wifi, MessageSquare, Mail, Send,
    Wallet, ArrowDownLeft, CreditCard, FileText, Zap
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    path: string;
    color: string;
    bg: string;
}

interface QuickActionsProps {
    onClose: () => void;
}

const ACTIONS: QuickAction[] = [
    { id: 'create-package', label: 'Create Package', description: 'Add new internet plan', icon: Package, path: '/tenant/packages', color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { id: 'add-subscriber', label: 'Add Subscriber', description: 'Register new user', icon: Users, path: '/tenant', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'connect-router', label: 'Connect Router', description: 'Setup MikroTik', icon: Wifi, path: '/tenant/mikrotik', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { id: 'send-sms', label: 'Send SMS', description: 'SMS campaign or blast', icon: MessageSquare, path: '/tenant/campaigns', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'send-email', label: 'Send Email', description: 'Email campaign', icon: Mail, path: '/tenant/campaigns', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'send-whatsapp', label: 'Send WhatsApp', description: 'WhatsApp blast', icon: Send, path: '/tenant/campaigns', color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'buy-sms', label: 'Buy SMS Credits', description: 'Purchase credit packs', icon: CreditCard, path: '/tenant/communication', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'withdraw', label: 'Request Withdrawal', description: 'Withdraw from wallet', icon: ArrowDownLeft, path: '/tenant/wallet', color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

const QuickActions: React.FC<QuickActionsProps> = ({ onClose }) => {
    const navigate = useNavigate();

    const handleSelect = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <div className="search-backdrop" onClick={onClose}>
            <div className="search-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-sky-500" />
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">Quick Actions</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions Grid */}
                <div className="p-4 grid grid-cols-2 gap-2">
                    {ACTIONS.map(action => (
                        <button
                            key={action.id}
                            onClick={() => handleSelect(action.path)}
                            className="flex items-center gap-3 p-3 rounded-xl text-left hover:bg-[var(--bg-surface-elevated)] transition-all group border border-transparent hover:border-[var(--border-subtle)]"
                        >
                            <div className={`p-2 rounded-lg ${action.bg} ${action.color} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                <action.icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{action.label}</p>
                                <p className="text-[11px] text-[var(--text-muted)] truncate">{action.description}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[var(--border-subtle)] text-center">
                    <span className="text-[11px] text-[var(--text-muted)]">
                        Press <kbd className="font-mono bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded text-[10px]">⌘J</kbd> anytime for quick actions
                    </span>
                </div>
            </div>
        </div>
    );
};

export default QuickActions;
