import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, CreditCard, Wifi, Users, MessageSquare, DollarSign, ShieldAlert, Activity } from 'lucide-react';
import axios from 'axios';

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

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    payment: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    subscriber: { icon: Users, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    sms: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    router: { icon: Wifi, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    security: { icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    system: { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await axios.get<Notification[]>('/api/v1/admin/notifications');
            setNotifications(Array.isArray(res.data) ? res.data : []);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] z-50 shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--border-subtle)] flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">Notifications</h2>
                        <p className="text-[11px] text-[var(--text-muted)]">
                            {loading ? 'Loading...' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-6 h-6 border-2 border-[var(--border-subtle)] border-t-sky-500 rounded-full animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-8">
                            <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] mb-4">
                                <Bell className="w-8 h-8 text-[var(--text-muted)]" />
                            </div>
                            <p className="text-sm font-semibold text-[var(--text-secondary)] mb-1">No notifications</p>
                            <p className="text-[12px] text-[var(--text-muted)]">You're all caught up. Notifications will appear here.</p>
                        </div>
                    ) : (
                        notifications.map(notification => {
                            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
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
                        })
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationCenter;
