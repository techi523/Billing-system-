import { Routes, Route } from 'react-router-dom';
import AdminPortal from './pages/AdminPortal';
import Login from './pages/Login';
import SuperAdminLogin from './pages/SuperAdminLogin';
import CaptivePortal from './pages/CaptivePortal';
import DemoAdmin from './pages/DemoAdmin';
import SuperAdminPortal from './pages/SuperAdminPortal';
import TenantPortal from './pages/TenantPortal';
import CustomerPortal from './pages/CustomerPortal';
import WalletPage from './pages/Wallet';

function App() {
    return (
        <div className="App">
            <Routes>
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="/demo-admin" element={<DemoAdmin />} />
                <Route path="/superadmin" element={<SuperAdminPortal />} />
                <Route path="/superadmin-login" element={<SuperAdminLogin />} />
                <Route path="/tenant" element={<TenantPortal />} />
                <Route path="/tenant/wallet" element={<WalletPage />} />
                <Route path="/customer" element={<CustomerPortal />} />
                <Route path="/login" element={<Login />} />
                <Route path="/portal" element={<CaptivePortal />} />
                <Route path="/" element={<Login />} />
            </Routes>
        </div>
    );
}

export default App;
