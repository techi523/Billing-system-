import { useState, useEffect } from 'react';
import SuperAdminDashboard from '../components/SuperAdmin/SuperAdminDashboard';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/Common/BackButton';
import ThemeToggle from '../components/Common/ThemeToggle';

const SuperAdminPortal = () => {
    const { logout, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            setIsLoading(false);
        }
    }, [authLoading]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center transition-colors duration-300">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--border-subtle)] border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[var(--text-secondary)] font-bold">Authenticating Super Admin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-main)] transition-colors duration-300">
            {/* Super Admin Header */}
            <div className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] sticky top-0 z-50 shadow-sm transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-6">
                        <BackButton to="/" label="Home" variant="dark" />
                        <div className="flex-1 flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-black text-[var(--text-primary)]">Super Admin Dashboard</h1>
                                <p className="text-[var(--text-secondary)] font-bold">Platform-wide Governance & Control</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <ThemeToggle />
                                <span className="px-3 py-1 bg-sky-500/20 text-sky-600 text-[10px] font-black rounded-full uppercase tracking-widest">
                                    SUPER ADMIN
                                </span>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] font-bold rounded-xl hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all hover:text-[var(--text-primary)]"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-8">
                <SuperAdminDashboard />
            </div>
        </div>
    );
};

export default SuperAdminPortal;
