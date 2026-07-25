import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, Package, Wifi, Wallet, MessageSquare, BarChart3, FileText, ArrowRight } from 'lucide-react';

interface SearchResult {
    id: string;
    type: 'subscriber' | 'package' | 'router' | 'transaction' | 'campaign';
    title: string;
    subtitle: string;
    path: string;
}

interface GlobalSearchProps {
    onClose: () => void;
}

const SEARCH_CATEGORIES = [
    { type: 'subscriber', label: 'Subscribers', icon: Users, path: '/tenant' },
    { type: 'package', label: 'Packages', icon: Package, path: '/tenant/packages' },
    { type: 'router', label: 'Routers', icon: Wifi, path: '/tenant/mikrotik' },
    { type: 'transaction', label: 'Transactions', icon: Wallet, path: '/tenant/wallet' },
    { type: 'campaign', label: 'Campaigns', icon: MessageSquare, path: '/tenant/campaigns' },
    { type: 'analytics', label: 'Analytics', icon: BarChart3, path: '/tenant/analytics' },
    { type: 'sms', label: 'SMS Credits', icon: MessageSquare, path: '/tenant/communication' },
    { type: 'profile', label: 'Profile & Settings', icon: FileText, path: '/tenant/profile' },
];

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const filteredCategories = query
        ? SEARCH_CATEGORIES.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
        : SEARCH_CATEGORIES;

    const handleSelect = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filteredCategories.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filteredCategories[selectedIndex]) {
            handleSelect(filteredCategories[selectedIndex].path);
        }
    };

    return (
        <div className="search-backdrop" onClick={onClose}>
            <div className="search-modal" onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
                    <Search className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search pages, subscribers, packages..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] outline-none"
                    />
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto py-2">
                    {filteredCategories.length === 0 ? (
                        <div className="px-5 py-8 text-center text-[var(--text-muted)] text-sm">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-1.5">
                                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                    {query ? 'Results' : 'Quick Navigation'}
                                </span>
                            </div>
                            {filteredCategories.map((cat, idx) => (
                                <button
                                    key={cat.type}
                                    onClick={() => handleSelect(cat.path)}
                                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                                        idx === selectedIndex
                                            ? 'bg-sky-500/10 text-sky-600'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)]'
                                    }`}
                                >
                                    <cat.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-medium">{cat.label}</span>
                                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                                </button>
                            ))}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><kbd className="font-mono bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">↑↓</kbd> Navigate</span>
                        <span className="flex items-center gap-1"><kbd className="font-mono bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">↵</kbd> Open</span>
                    </div>
                    <span className="flex items-center gap-1"><kbd className="font-mono bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">Esc</kbd> Close</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
