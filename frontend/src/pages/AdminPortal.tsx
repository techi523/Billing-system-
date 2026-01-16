import AdminDashboard from '../components/Admin/Dashboard';

const AdminPortal = () => {
    return (
        <div className="p-6 space-y-8">
            <AdminDashboard />
            {/* Future admin sections such as TenantList, AuditLog, Settings can be added here */}
        </div>
    );
};

export default AdminPortal;
