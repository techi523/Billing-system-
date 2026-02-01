import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SupportProvider } from './context/SupportContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import SuperAdminLogin from './pages/SuperAdminLogin';
import PasswordResetRequest from './pages/PasswordResetRequest';
import CaptivePortal from './pages/CaptivePortal';

// Protected Pages - Admin
import AdminPortal from './pages/AdminPortal';
import DemoAdmin from './pages/DemoAdmin';

// Protected Pages - Super Admin
import SuperAdminPortal from './pages/SuperAdminPortal';

// Protected Pages - Tenant
import TenantPortal from './pages/TenantPortal';
import TenantSetup from './pages/TenantSetup';
import Packages from './pages/Packages';
import Analytics from './pages/Analytics';
import MikrotikCenter from './pages/MikrotikCenter';
import Wallet from './pages/Wallet';
import Campaigns from './pages/Campaigns';
import CustomerPortal from './pages/CustomerPortal';

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <SupportProvider>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/password-reset" element={<PasswordResetRequest />} />
                            <Route path="/captive-portal" element={<CaptivePortal />} />

                            {/* Super Admin Login (Explicit) */}
                            <Route path="/superadmin/login" element={<SuperAdminLogin />} />

                            {/* Protected Super Admin Routes */}
                            <Route
                                path="/superadmin/*"
                                element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <SuperAdminPortal />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Protected Tenant Routes */}
                            <Route path="/tenant/setup" element={
                                <ProtectedRoute allowedRoles={['TENANT']}>
                                    <TenantSetup />
                                </ProtectedRoute>
                            } />

                            <Route path="/tenant" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF', 'AGENT']}>
                                    <TenantPortal />
                                </ProtectedRoute>
                            } />

                            <Route path="/tenant/packages" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <Packages />
                                </ProtectedRoute>
                            } />

                            <Route path="/tenant/analytics" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <Analytics />
                                </ProtectedRoute>
                            } />

                            <Route path="/tenant/mikrotik" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <MikrotikCenter />
                                </ProtectedRoute>
                            } />

                            <Route path="/tenant/wallet" element={
                                <ProtectedRoute allowedRoles={['TENANT']}>
                                    <Wallet />
                                </ProtectedRoute>
                            } />

                            <Route path="/tenant/campaigns" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <Campaigns />
                                </ProtectedRoute>
                            } />

                            {/* Legacy / Admin Routes */}
                            <Route path="/admin/*" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <AdminPortal />
                                </ProtectedRoute>
                            } />

                            <Route path="/demo" element={<DemoAdmin />} />

                            {/* Customer Portal */}
                            <Route path="/customer/*" element={<CustomerPortal />} />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </SupportProvider>
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
