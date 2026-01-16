import AdminPortal from './pages/AdminPortal';
import { LayoutDashboard, Users, Radio, CreditCard, Ticket, Settings, LogOut, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from './assets/logo.png';

// Mock Auth Check
const useAuth = () => {
  const [user, setUser] = useState<{ role: string, name: string } | null>(null);
  useEffect(() => {
    // In real app, check JWT
    const token = localStorage.getItem('token');
    if (token) {
      // Decode and set user
      setUser({ role: 'TENANT_ADMIN', name: 'SurfBill Alpha' });
    }
  }, []);
  return user;
};

const SidebarLink = ({ to, icon: Icon, children, active }: any) => (
  <Link
    to={to}
    className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active
      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-transparent group-hover:bg-slate-700'}`}>
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="font-bold text-sm tracking-tight">{children}</span>
  </Link>
);

const AppLayout = ({ children }: any) => {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex w-72 bg-[#0f172a] text-white flex-col p-6 shadow-2xl z-20 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex items-center gap-3 px-2 py-8 mb-4 relative z-10">
          <img src={logo} className="w-12 h-12 rounded-2xl shadow-lg shadow-sky-500/20" alt="SurfBill Logo" />
          <div>
            <span className="text-2xl font-black tracking-tighter block leading-none">SurfBill</span>
            <span className="text-[10px] font-black uppercase text-sky-400 tracking-[0.2em] mt-1 block">Smart Billing</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 relative z-10">
          <SidebarLink to="/dashboard" icon={LayoutDashboard} active={location.pathname === '/dashboard' || location.pathname === '/admin'}>Overview</SidebarLink>
          <SidebarLink to="/routers" icon={Radio} active={location.pathname === '/routers'}>Network Nodes</SidebarLink>
          <SidebarLink to="/packages" icon={CreditCard} active={location.pathname === '/packages'}>Service Plans</SidebarLink>
          <div className="py-4 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Client Management</div>
          <SidebarLink to="/subscribers" icon={Users} active={location.pathname === '/subscribers'}>Subscribers</SidebarLink>
          <SidebarLink to="/vouchers" icon={Ticket} active={location.pathname === '/vouchers'}>Inventory</SidebarLink>
          <SidebarLink to="/settings" icon={Settings} active={location.pathname === '/settings'}>Governance</SidebarLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800/50 relative z-10">
          <SidebarLink to="/help" icon={HelpCircle} active={location.pathname === '/help'}>Support Center</SidebarLink>
          <button
            onClick={logout}
            className="flex items-center gap-4 px-4 py-4 w-full text-slate-500 hover:text-rose-400 transition-colors group"
          >
            <div className="p-2 rounded-xl group-hover:bg-rose-500/10 transition-colors">
              <LogOut size={18} />
            </div>
            <span className="font-bold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main View */}
      <main className="flex-1 overflow-y-auto relative bg-[#f8fafc] pb-24 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200 px-6 lg:px-10 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 capitalize leading-none tracking-tight">
              {location.pathname.replace('/', '').replace('admin', 'Dashboard') || 'Overview'}
            </h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-bold sm:font-semibold mt-1">Nairobi, KE Hub • All Nodes Online</p>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-black text-slate-900">Maina Kamau</p>
              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Admin</p>
            </div>
            <div className="relative group">
              <div className="w-10 lg:w-12 h-10 lg:h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl lg:rounded-2xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center font-black text-slate-600 group-hover:border-sky-400 transition-all cursor-pointer">
                MK
              </div>
              <div className="absolute right-0 top-full mt-2 w-3 lg:w-4 bg-emerald-500 h-3 lg:h-4 rounded-full border-4 border-white"></div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 page-fade-in relative z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/80 backdrop-blur-2xl border-t border-slate-100 p-3 z-40 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          {[
            { to: '/dashboard', icon: LayoutDashboard },
            { to: '/routers', icon: Radio },
            { to: '/packages', icon: CreditCard },
            { to: '/subscribers', icon: Users },
            { to: '/settings', icon: Settings }
          ].map((item, i) => (
            <Link key={i} to={item.to} className={`p-4 rounded-2xl transition-all ${location.pathname.includes(item.to) || (item.to === '/dashboard' && location.pathname === '/admin') ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400'}`}>
              <item.icon size={22} strokeWidth={2.5} />
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
};

// --- PAGES ---

// Dashboard component removed (unused)

import CaptivePortal from './pages/CaptivePortal';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import TenantOverview from './components/Dashboard/TenantOverview';
import RouterList from './components/Routers/RouterList';
import PackagePlans from './components/Packages/PackagePlans';
import SubscriberList from './components/Subscribers/SubscriberList';
import VoucherManager from './components/Vouchers/VoucherManager';

function App() {
  const user = useAuth() || { role: 'SUPER_ADMIN', name: 'Admin' }; // Default to super admin for testing

  return (
    <Routes>
      <Route path="/" element={<CaptivePortal />} />
      <Route path="/portal" element={<CaptivePortal />} />
      <Route path="/admin" element={<AppLayout><AdminPortal /></AppLayout>} />
      <Route path="/dashboard" element={<AppLayout><TenantOverview /></AppLayout>} />
      <Route path="/routers" element={<AppLayout><RouterList /></AppLayout>} />
      <Route path="/packages" element={<AppLayout><PackagePlans /></AppLayout>} />
      <Route path="/subscribers" element={<AppLayout><SubscriberList /></AppLayout>} />
      <Route path="/vouchers" element={<AppLayout><VoucherManager /></AppLayout>} />
      <Route path="/login" element={<div className="flex items-center justify-center h-screen bg-slate-900 text-white font-bold text-4xl italic tracking-tighter">SURFBILL. LOGIN</div>} />
    </Routes>
  );
}

export default App;
