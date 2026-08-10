import { AdminUser, Tenant } from '../src/models';

async function main() {
    try {
        const users = await AdminUser.findAll();
        console.log('--- ADMIN USERS ---');
        for (const u of users) {
            console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | TenantId: ${u.tenantId}`);
        }
        const tenants = await Tenant.findAll();
        console.log('--- TENANTS ---');
        for (const t of tenants) {
            console.log(`ID: ${t.id} | Name: ${t.name} | Subdomain: ${t.subdomain}`);
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

main();
