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

// Protected Pages - Super Admin
import SuperAdminPortal from './pages/SuperAdminPortal';

// Protected Pages - Platform Owner
import PlatformOwnerPortal from './pages/PlatformOwnerPortal';
import ImpersonationBanner from './components/ImpersonationBanner';
import CheckoutPortal from './pages/CheckoutPortal';

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
import MarketingSuite from './pages/Marketing/MarketingSuite';
import SaaSMonetisationSuite from './pages/SuperAdmin/SaaSMonetisationSuite';
import TenantBillingHub from './pages/TenantBillingHub';
import RouterManagement from './pages/RouterManagement';
import NetworkMonitoring from './pages/NetworkMonitoring';
import RouterBackups from './pages/RouterBackups';
import Reports from './pages/Reports';
import ActiveSessions from './pages/ActiveSessions';
import RefundsManagement from './pages/RefundsManagement';
import SubscribersManagement from './pages/SubscribersManagement';
import BrandingCenter from './pages/SuperAdmin/BrandingCenter';
import PrivacyPolicy from './pages/Public/PrivacyPolicy';
import TermsConditions from './pages/Public/TermsConditions';
import AboutUs from './pages/Public/AboutUs';
import ContactUs from './pages/Public/ContactUs';
import SystemStatus from './pages/Public/SystemStatus';
import HelpCenter from './pages/Public/HelpCenter';
import { BrandingProvider } from './context/BrandingContext';


function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <BrandingProvider>
                        <SupportProvider>
                            <ImpersonationBanner />
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/password-reset" element={<PasswordResetRequest />} />
                                <Route path="/captive-portal" element={<CaptivePortal />} />

                                {/* Public Trust Pages */}
                                <Route path="/privacy" element={<PrivacyPolicy />} />
                                <Route path="/terms" element={<TermsConditions />} />
                                <Route path="/about" element={<AboutUs />} />
                                <Route path="/contact" element={<ContactUs />} />
                                <Route path="/status" element={<SystemStatus />} />
                                <Route path="/help" element={<HelpCenter />} />
                                <Route path="/checkout" element={<CheckoutPortal />} />

                            {/* Super Admin Login (Explicit) */}
                            <Route path="/superadmin/login" element={<SuperAdminLogin />} />

                            {/* Protected Platform Owner Routes */}
                            <Route
                                path="/platform-owner/*"
                                element={
                                    <ProtectedRoute allowedRoles={['PLATFORM_OWNER', 'SUPER_ADMIN']}>
                                        <PlatformOwnerPortal />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Protected Super Admin Routes */}
                            <Route
                                path="/superadmin/*"
                                element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PLATFORM_OWNER']}>
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

                                <Route path="/tenant/marketing/*" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <MarketingSuite />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/profile" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/subscription" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <TenantBillingHub />
                                    </ProtectedRoute>
                                } />

                                <Route path="/superadmin/monetisation" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                        <SaaSMonetisationSuite />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/router-management" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <RouterManagement />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/network-monitoring" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <NetworkMonitoring />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/router-backups" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <RouterBackups />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/reports" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <Reports />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/sessions" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <ActiveSessions />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/refunds" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <RefundsManagement />
                                    </ProtectedRoute>
                                } />

                                <Route path="/tenant/subscribers" element={
                                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TENANT', 'STAFF']}>
                                        <SubscribersManagement />
                                    </ProtectedRoute>
                                } />

                            </Route>

                            {/* Legacy / Admin Routes */}
                            <Route path="/admin/*" element={
                                <ProtectedRoute allowedRoles={['TENANT', 'STAFF']}>
                                    <AdminPortal />
                                </ProtectedRoute>
                            } />

                            {/* Customer Portal */}
                            <Route path="/customer/*" element={<CustomerPortal />} />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </SupportProvider>
                    </BrandingProvider>
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
