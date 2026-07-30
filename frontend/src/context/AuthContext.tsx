import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
    id: string;
    email: string;
    role: 'PLATFORM_OWNER' | 'SUPER_ADMIN' | 'TENANT' | 'STAFF' | 'AGENT';
    tenantId: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    loading: boolean;
    isImpersonating: boolean;
    impersonatedTenantName: string | null;
    startImpersonation: (impersonationToken: string, tenantName: string) => void;
    stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
        return !!localStorage.getItem('original_token');
    });
    const [impersonatedTenantName, setImpersonatedTenantName] = useState<string | null>(() => {
        return localStorage.getItem('impersonated_tenant_name');
    });

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser) {
                try {
                    const response = await axios.get<{ user: User }>('/api/v1/auth/verify', {
                        headers: { Authorization: `Bearer ${storedToken}` }
                    });

                    const freshUser = response.data.user;
                    setToken(storedToken);
                    setUser(freshUser);
                    localStorage.setItem('user', JSON.stringify(freshUser));
                    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                } catch (error: unknown) {
                    console.error('[AuthContext] Token verification failed:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('original_token');
                    localStorage.removeItem('original_user');
                    localStorage.removeItem('impersonated_tenant_name');
                    setIsImpersonating(false);
                    delete axios.defaults.headers.common['Authorization'];
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const startImpersonation = (impersonationToken: string, tenantName: string) => {
        if (token && user) {
            localStorage.setItem('original_token', token);
            localStorage.setItem('original_user', JSON.stringify(user));
            localStorage.setItem('impersonated_tenant_name', tenantName);

            // Parse payload or create temporary impersonated user representation
            const impersonatedUser: User = {
                id: user.id,
                email: user.email,
                role: 'TENANT',
                tenantId: user.tenantId
            };

            setToken(impersonationToken);
            setUser(impersonatedUser);
            setIsImpersonating(true);
            setImpersonatedTenantName(tenantName);

            localStorage.setItem('token', impersonationToken);
            localStorage.setItem('user', JSON.stringify(impersonatedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${impersonationToken}`;
        }
    };

    const stopImpersonation = () => {
        const origToken = localStorage.getItem('original_token');
        const origUserStr = localStorage.getItem('original_user');

        if (origToken && origUserStr) {
            const origUser = JSON.parse(origUserStr) as User;
            setToken(origToken);
            setUser(origUser);
            setIsImpersonating(false);
            setImpersonatedTenantName(null);

            localStorage.setItem('token', origToken);
            localStorage.setItem('user', origUserStr);
            localStorage.removeItem('original_token');
            localStorage.removeItem('original_user');
            localStorage.removeItem('impersonated_tenant_name');

            axios.defaults.headers.common['Authorization'] = `Bearer ${origToken}`;
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await axios.post('/api/v1/auth/logout', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error('[AuthContext] Backend logout failed:', error);
        } finally {
            setToken(null);
            setUser(null);
            setIsImpersonating(false);
            setImpersonatedTenantName(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('original_token');
            localStorage.removeItem('original_user');
            localStorage.removeItem('impersonated_tenant_name');
            delete axios.defaults.headers.common['Authorization'];
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            loading,
            isImpersonating,
            impersonatedTenantName,
            startImpersonation,
            stopImpersonation
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
