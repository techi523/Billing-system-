import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('SUPER_ADMIN' | 'TENANT' | 'STAFF' | 'AGENT')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`[ProtectedRoute] Access denied to ${location.pathname}. Role ${user.role} not in [${allowedRoles}]`);

        // Redirect to their respective dashboard if they're in the wrong place
        const redirectPath = user.role === 'SUPER_ADMIN' ? '/superadmin' : '/tenant';

        // Prevent infinite redirect if we are already at the redirectPath
        if (location.pathname === redirectPath) {
            console.error(`[ProtectedRoute] Already at ${redirectPath} but role ${user.role} still not allowed? Check role strings.`);
            return <>{children}</>;
        }

        console.log(`[ProtectedRoute] Redirecting for role ${user.role} to ${redirectPath}`);
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
