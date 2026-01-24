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
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
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
                    <Route path="/" element={<Login />} />

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
                        path="/tenant/wallet"
                        element={
                            <ProtectedRoute allowedRoles={['TENANT']}>
                                <WalletPage />
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
            </div>
        </AuthProvider>
    );
}

export default App;
