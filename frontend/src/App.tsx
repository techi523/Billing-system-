import { Routes, Route } from 'react-router-dom';
import AdminPortal from './pages/AdminPortal';
import Login from './pages/Login';
import SuperAdminLogin from './pages/SuperAdminLogin';
import CaptivePortal from './pages/CaptivePortal';
import SuperAdminPortal from './pages/SuperAdminPortal';
import TenantPortal from './pages/TenantPortal';
import CustomerPortal from './pages/CustomerPortal';
import WalletPage from './pages/Wallet';
import Register from './pages/Register';
import PasswordResetRequest from './pages/PasswordResetRequest';
import PasswordResetConfirm from './pages/PasswordResetConfirm';
import Analytics from './pages/Analytics';
import MikrotikCenter from './pages/MikrotikCenter';
import Packages from './pages/Packages';
import TenantSetup from './pages/TenantSetup';
import { AuthProvider } from './context/AuthContext';
import { SupportProvider } from './context/SupportContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import SupportButton from './components/Common/SupportButton';
import LandingPage from './pages/LandingPage';

function App() {
    return (
        <SupportProvider>
            <ThemeProvider>
                <AuthProvider>
                    <div className="App">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/superadmin-login" element={<SuperAdminLogin />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/password-reset" element={<PasswordResetRequest />} />
                            <Route path="/reset-password" element={<PasswordResetConfirm />} />
                            <Route path="/portal" element={<CaptivePortal />} />
                            <Route path="/" element={<LandingPage />} />

                            {/* Tenant Routes */}
                            <Route
                                path="/tenant"
                                element={
                                    <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                        <TenantPortal />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenant/setup"
                                element={
                                    <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                        <TenantSetup />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenant/wallet"
                                element={
                                    <ProtectedRoute allowedRoles={['TENANT']}>
                                        <WalletPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenant/analytics"
                                element={
                                    <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                        <Analytics />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenant/mikrotik"
                                element={
                                    <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                        <MikrotikCenter />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/tenant/packages"
                                element={
                                    <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                        <Packages />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute allowedRoles={['STAFF']}>
                                        <AdminPortal />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Super Admin Routes */}
                            <Route
                                path="/superadmin"
                                element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <SuperAdminPortal />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Customer Routes (Public/Self-Care) */}
                            <Route path="/customer" element={<CustomerPortal />} />
                        </Routes>

                        {/* Floating Global Support Button */}
                        <SupportButton />
                    </div>
                </AuthProvider>
            </ThemeProvider>
        </SupportProvider>
    );
}

export default App;
