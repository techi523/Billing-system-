import { AdminUser, Tenant } from './src/models';

async function checkTenantUsers() {
    try {
        const users = await AdminUser.findAll({ include: [Tenant] });
        console.log(`Found ${users.length} users:`);
        for (const u of users) {
            console.log(`- ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | TenantId: ${u.tenantId}`);
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

checkTenantUsers();
