import React from 'react';
import {
    X, CreditCard, Wifi, Users, MessageSquare, DollarSign,
    CheckCircle2, AlertTriangle, Info, ShieldAlert, Activity
} from 'lucide-react';

interface Notification {
    id: string;
    type: 'payment' | 'subscriber' | 'sms' | 'router' | 'security' | 'system';
    title: string;
    description: string;
    time: string;
    read: boolean;
}

interface NotificationCenterProps {
    onClose: () => void;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: '1', type: 'payment', title: 'Payment Received', description: 'KES 500 payment from subscriber #1042', time: '2 min ago', read: false },
    { id: '2', type: 'router', title: 'Router Offline', description: 'Router "Main-Office-RB750" went offline', time: '15 min ago', read: false },
    { id: '3', type: 'system', title: 'System Update', description: 'Platform v2.4 deployed successfully', time: '1 hour ago', read: false },
    { id: '4', type: 'subscriber', title: 'New Subscriber', description: 'john@email.com activated Premium package', time: '2 hours ago', read: true },
    { id: '5', type: 'sms', title: 'Campaign Sent', description: 'SMS campaign "July Promo" sent to 342 users', time: '3 hours ago', read: true },
    { id: '6', type: 'security', title: 'Login Alert', description: 'New login from Chrome on Windows', time: '5 hours ago', read: true },
];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    payment: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    subscriber: { icon: Users, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    sms: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    router: { icon: Wifi, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    security: { icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    system: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] z-50 shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--border-subtle)] flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">Notifications</h2>
                        <p className="text-[11px] text-[var(--text-muted)]">{MOCK_NOTIFICATIONS.filter(n => !n.read).length} unread</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                            Mark all read
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto">
                    {MOCK_NOTIFICATIONS.map(notification => {
                        const config = TYPE_CONFIG[notification.type];
                        const Icon = config.icon;
                        return (
                            <button
                                key={notification.id}
                                className={`w-full flex items-start gap-3 px-6 py-4 text-left border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)] transition-colors ${
                                    !notification.read ? 'bg-sky-500/[0.03]' : ''
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${config.bg} ${config.color} flex-shrink-0 mt-0.5`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm font-semibold truncate ${!notification.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                            {notification.title}
                                        </p>
                                        {!notification.read && (
                                            <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate">{notification.description}</p>
                                    <p className="text-[11px] text-[var(--text-muted)] mt-1">{notification.time}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 border-t border-[var(--border-subtle)] p-4">
                    <button className="w-full py-2.5 text-center text-sm font-semibold text-sky-500 hover:bg-sky-500/10 rounded-lg transition-colors">
                        View All Notifications
                    </button>
                </div>
            </div>
        </>
    );
};

export default NotificationCenter;
