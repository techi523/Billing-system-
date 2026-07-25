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
import DashboardLayout from './components/Dashboard/DashboardLayout';
import TenantSetup from './pages/TenantSetup';
import TenantPortal from './pages/TenantPortal';
import Packages from './pages/Packages';
import Analytics from './pages/Analytics';
import MikrotikCenter from './pages/MikrotikCenter';
import Wallet from './pages/Wallet';
import Campaigns from './pages/Campaigns';
import CustomerPortal from './pages/CustomerPortal';
import SMSCredits from './pages/SMSCredits';
import ProfilePage from './pages/Profile';

import { StagingDashboard } from './pages/StagingDashboard';

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
                            <Route path="/staging" element={<StagingDashboard />} />

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

                            {/* Protected Tenant Setup */}
                            <Route path="/tenant/setup" element={
                                <ProtectedRoute allowedRoles={['TENANT']}>
                                    <TenantSetup />
                                </ProtectedRoute>
                            } />

                            {/* ─── Tenant Dashboard Shell ─── */}
                            <Route element={
                                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF', 'AGENT']}>
                                    <DashboardLayout />
                                </ProtectedRoute>
                            }>
                                <Route path="/tenant" element={<TenantPortal />} />

                                <Route path="/tenant/packages" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <Packages />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/analytics" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <Analytics />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/mikrotik" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <MikrotikCenter />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/wallet" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT']}>
                                        <Wallet />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/campaigns" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <Campaigns />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/communication" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <SMSCredits />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/profile" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/testing" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <StagingDashboard />
                                    </ProtectedRoute>
                                } />
                            </Route>

                            {/* Legacy / Admin Routes */}
                            <Route path="/admin/*" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <AdminPortal />
                                </ProtectedRoute>
                            } />

                            <Route path="/demo" element={<DemoAdmin />} />

                            {/* Customer Portal */}
                            <Route path="/customer/*" element={<CustomerPortal />} />

                            {/* Legacy redirect */}
                            <Route path="/testing" element={<Navigate to="/tenant/testing" replace />} />

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
