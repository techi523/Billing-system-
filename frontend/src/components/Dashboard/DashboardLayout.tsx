import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard, BarChart3, Users, Package, Wifi, MessageSquare,
    Wallet, Settings, HelpCircle, ChevronLeft, ChevronRight,
    Search, Bell, Menu, X, LogOut, User, Shield, Zap,
    FileText, CreditCard, Radio, Send, Globe, Terminal,
    Palette, Lock, BellRing, BookOpen, Headphones, Activity
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../Common/ThemeToggle';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import QuickActions from './QuickActions';

// ─── Sidebar Menu Configuration ─────────────────────────────────
interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    path: string;
    badge?: string;
}

interface MenuSection {
    label: string;
    items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
    {
        label: '',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/tenant' },
        ]
    },
    {
        label: 'Business',
        items: [
            { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/tenant/analytics' },
        ]
    },
    {
        label: 'Subscribers',
        items: [
            { id: 'subscribers', label: 'Subscribers', icon: Users, path: '/tenant' },
        ]
    },
    {
        label: 'Packages',
        items: [
            { id: 'packages', label: 'Internet Packages', icon: Package, path: '/tenant/packages' },
        ]
    },
    {
        label: 'Network',
        items: [
            { id: 'routers', label: 'MikroTik Routers', icon: Wifi, path: '/tenant/mikrotik' },
            { id: 'captive', label: 'Captive Portal', icon: Globe, path: '/captive-portal' },
        ]
    },
    {
        label: 'Communication',
        items: [
            { id: 'campaigns', label: 'Campaigns', icon: Send, path: '/tenant/campaigns' },
            { id: 'sms', label: 'SMS Credits', icon: MessageSquare, path: '/tenant/communication' },
        ]
    },
    {
        label: 'Finance',
        items: [
            { id: 'wallet', label: 'Wallet & Treasury', icon: Wallet, path: '/tenant/wallet' },
        ]
    },
    {
        label: 'Settings',
        items: [
            { id: 'profile', label: 'Profile', icon: User, path: '/tenant/profile' },
            { id: 'branding', label: 'Branding', icon: Palette, path: '/tenant/profile' },
            { id: 'security', label: 'Security', icon: Lock, path: '/tenant/profile' },
            { id: 'notifications', label: 'Notifications', icon: BellRing, path: '/tenant/profile' },
        ]
    },

];

// ─── Breadcrumb Mapping ─────────────────────────────────────────
const BREADCRUMB_MAP: Record<string, string> = {
    '/tenant': 'Dashboard',
    '/tenant/analytics': 'Analytics',
    '/tenant/packages': 'Packages',
    '/tenant/mikrotik': 'MikroTik Routers',
    '/tenant/campaigns': 'Campaigns',
    '/tenant/communication': 'SMS Credits',
    '/tenant/wallet': 'Wallet & Treasury',
    '/tenant/profile': 'Profile & Settings',

};

// ─── Component ──────────────────────────────────────────────────
const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [quickActionsOpen, setQuickActionsOpen] = useState(false);
    const [profileDropdown, setProfileDropdown] = useState(false);

    // Live data for top bar
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [smsBalance, setSmsBalance] = useState<number>(0);
    const [unreadCount, setUnreadCount] = useState<number>(3);

    // Persist sidebar collapse
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
        setProfileDropdown(false);
    }, [location.pathname]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                setQuickActionsOpen(true);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setNotificationsOpen(false);
                setQuickActionsOpen(false);
                setProfileDropdown(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Fetch live balances
    const fetchBalances = useCallback(async () => {
        try {
            const [walletRes, smsRes] = await Promise.all([
                axios.get<{ balance: number }>('/api/v1/wallet/balance').catch(() => ({ data: { balance: 0 } })),
                axios.get<{ balance: number }>('/api/v1/sms/balance').catch(() => ({ data: { balance: 0 } })),
            ]);
            setWalletBalance(walletRes.data.balance || 0);
            setSmsBalance(smsRes.data.balance || 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchBalances();
        const interval = setInterval(fetchBalances, 60000);
        return () => clearInterval(interval);
    }, [fetchBalances]);

    const currentPath = location.pathname;
    const breadcrumbLabel = BREADCRUMB_MAP[currentPath] || 'Dashboard';

    const isActive = (path: string, id: string) => {
        if (id === 'dashboard' || id === 'subscribers') return currentPath === '/tenant';
        if (id === 'branding') return currentPath === '/tenant/profile';
        if (id === 'security') return currentPath === '/tenant/profile';
        if (id === 'notifications') return currentPath === '/tenant/profile';
        return currentPath === path;
    };

    const handleNavigation = (item: MenuItem) => {
        if (item.path === '/captive-portal') {
            window.open(item.path, '_blank');
            return;
        }
        navigate(item.path);
    };

    // ─── Sidebar Content ────────────────────────────────────────
    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--sidebar-border)] flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                </div>
                {!sidebarCollapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-base font-black text-[var(--text-primary)] truncate leading-tight">SurfBill</h1>
                        <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">WiFi Billing Platform</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-3 space-y-1">
                {MENU_SECTIONS.map((section, idx) => (
                    <div key={idx}>
                        {section.label && !sidebarCollapsed && (
                            <div className="sidebar-section-label mt-4 mb-1">{section.label}</div>
                        )}
                        {section.label && sidebarCollapsed && idx > 0 && (
                            <div className="my-2 mx-2 border-t border-[var(--border-subtle)]" />
                        )}
                        {section.items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleNavigation(item)}
                                className={`sidebar-nav-item w-full ${isActive(item.path, item.id) ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                                {!sidebarCollapsed && (
                                    <span className="truncate">{item.label}</span>
                                )}
                                {!sidebarCollapsed && item.badge && (
                                    <span className="ml-auto text-[10px] font-semibold bg-sky-500/10 text-sky-600 px-2 py-0.5 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Collapse Toggle (Desktop Only) */}
            <div className="hidden lg:flex border-t border-[var(--sidebar-border)] p-3">
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="sidebar-nav-item w-full justify-center"
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-[18px] h-[18px]" />
                    ) : (
                        <>
                            <ChevronLeft className="w-[18px] h-[18px]" />
                            <span className="truncate">Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-200">
            {/* ─── Sidebar (Desktop) ──────────────────────────── */}
            <aside className={`dashboard-sidebar hidden lg:flex ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <SidebarContent />
            </aside>

            {/* ─── Mobile Sidebar ─────────────────────────────── */}
            {mobileOpen && (
                <>
                    <div className="sidebar-overlay lg:hidden" onClick={() => setMobileOpen(false)} />
                    <aside className="dashboard-sidebar flex lg:hidden animate-slide-in-right" style={{ width: 'var(--sidebar-w)' }}>
                        <SidebarContent />
                    </aside>
                </>
            )}

            {/* ─── Top Bar ────────────────────────────────────── */}
            <header
                className="dashboard-topbar"
                style={{ left: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)' }}
            >
                {/* Mobile menu button */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] mr-3"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-[var(--text-muted)]">Home</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="font-semibold text-[var(--text-primary)]">{breadcrumbLabel}</span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Search Trigger */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-sm hover:border-[var(--border-strong)] transition-all"
                    >
                        <Search className="w-4 h-4" />
                        <span className="hidden md:inline">Search...</span>
                        <kbd className="hidden md:inline text-[10px] font-mono bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">⌘K</kbd>
                    </button>

                    {/* Wallet Balance */}
                    <button
                        onClick={() => navigate('/tenant/wallet')}
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                    >
                        <Wallet className="w-3.5 h-3.5" />
                        KES {(walletBalance / 100).toLocaleString()}
                    </button>

                    {/* SMS Balance */}
                    <button
                        onClick={() => navigate('/tenant/communication')}
                        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-600 text-xs font-semibold hover:bg-sky-500/20 transition-all"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {smsBalance} SMS
                    </button>

                    {/* Quick Actions */}
                    <button
                        onClick={() => setQuickActionsOpen(true)}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] transition-all"
                        title="Quick Actions (⌘J)"
                    >
                        <Zap className="w-[18px] h-[18px]" />
                    </button>

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notifications */}
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] transition-all"
                    >
                        <Bell className="w-[18px] h-[18px]" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center badge-pulse">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileDropdown(!profileDropdown)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-surface-elevated)] transition-all"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </button>

                        {profileDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdown(false)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-50 py-2 animate-scale-in">
                                    <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.email}</p>
                                        <p className="text-[11px] text-[var(--text-muted)]">{user?.role}</p>
                                    </div>
                                    <button
                                        onClick={() => { navigate('/tenant/profile'); setProfileDropdown(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <User className="w-4 h-4" /> Profile & Settings
                                    </button>
                                    <button
                                        onClick={() => { navigate('/tenant/wallet'); setProfileDropdown(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <CreditCard className="w-4 h-4" /> Wallet & Treasury
                                    </button>
                                    <div className="border-t border-[var(--border-subtle)] my-1" />
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ─── Main Content ────────────────────────────────── */}
            <main
                className="dashboard-content"
                style={{ marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)' }}
            >
                <div className="p-6 page-fade-in">
                    <Outlet />
                </div>
            </main>

            {/* ─── Overlays ───────────────────────────────────── */}
            {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
            {notificationsOpen && <NotificationCenter onClose={() => setNotificationsOpen(false)} />}
            {quickActionsOpen && <QuickActions onClose={() => setQuickActionsOpen(false)} />}
        </div>
    );
};

export default DashboardLayout;
