import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const themes: { id: 'light' | 'dark' | 'system'; icon: React.ElementType; label: string }[] = [
        { id: 'light', icon: Sun, label: 'Light' },
        { id: 'dark', icon: Moon, label: 'Dark' },
        { id: 'system', icon: Laptop, label: 'System' }
    ];

    return (
        <div className="flex bg-[var(--bg-surface-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] shadow-sm">
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`relative p-2 rounded-lg transition-all duration-300 flex items-center justify-center group ${theme === t.id
                        ? 'text-sky-500'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                        }`}
                    title={t.label}
                >
                    {theme === t.id && (
                        <motion.div
                            layoutId="active-theme"
                            className="absolute inset-0 bg-[var(--bg-surface)] rounded-lg shadow-sm border border-[var(--border-strong)]"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <t.icon size={18} className="relative z-10" />

                    {/* Tooltip on hover */}
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                        {t.label} Mode
                    </span>
                </button>
            ))}
        </div>
    );
};

export default ThemeToggle;
