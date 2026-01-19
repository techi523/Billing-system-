import { Routes, Route } from 'react-router-dom';
import AdminPortal from './pages/AdminPortal';
import Login from './pages/Login';
import CaptivePortal from './pages/CaptivePortal';
import DemoAdmin from './pages/DemoAdmin';
import SuperAdminPortal from './pages/SuperAdminPortal';
import TenantPortal from './pages/TenantPortal';
import CustomerPortal from './pages/CustomerPortal';

function App() {
    return (
        <div className="App">
            <Routes>
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="/demo-admin" element={<DemoAdmin />} />
                <Route path="/superadmin" element={<SuperAdminPortal />} />
                <Route path="/tenant" element={<TenantPortal />} />
                <Route path="/customer" element={<CustomerPortal />} />
                <Route path="/login" element={<Login />} />
                <Route path="/portal" element={<CaptivePortal />} />
                <Route path="/" element={<Login />} />
            </Routes>
        </div>
    );
}

export default App;
