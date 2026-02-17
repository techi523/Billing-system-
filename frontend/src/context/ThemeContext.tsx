import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initial load from localStorage or fall back to system
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem('theme-preference') as Theme) || 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // Sync resolved theme based on settings
    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (t: 'light' | 'dark') => {
            root.classList.remove('light', 'dark');
            root.classList.add(t);
            setResolvedTheme(t);
        };

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            applyTheme(systemTheme);

            // Listen for system changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                applyTheme(e.matches ? 'dark' : 'light');
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            applyTheme(theme);
        }

        // Persist to localStorage
        localStorage.setItem('theme-preference', theme);
    }, [theme]);

    // Handle User Persistence (Backend Sync)
    useEffect(() => {
        const persistToBackend = async () => {
            const token = localStorage.getItem('token');
            if (token && theme !== 'system') {
                try {
                    await axios.post('/api/v1/auth/theme', { theme }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (e: unknown) {
                    console.error('Failed to sync theme preference to backend:', e);
                }
            }
        };
        persistToBackend();
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
