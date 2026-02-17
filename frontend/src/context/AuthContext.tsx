import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'TENANT' | 'STAFF' | 'AGENT';
    tenantId: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            // CRITICAL FIX: Verify token with backend to ensure fresh tenant data
            // This prevents stale localStorage from causing "new tenant" behavior
            axios.get<{ user: User }>('/api/v1/auth/verify', {
                headers: { Authorization: `Bearer ${storedToken}` }
            })
                .then(response => {
                    const freshUser = response.data.user;
                    setToken(storedToken);
                    setUser(freshUser); // Use fresh data from backend
                    localStorage.setItem('user', JSON.stringify(freshUser)); // Update localStorage
                    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                })
                .catch((error: unknown) => {
                    console.error('[AuthContext] Token verification failed:', error);
                    // Token invalid or expired, clear state
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    delete axios.defaults.headers.common['Authorization'];
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
