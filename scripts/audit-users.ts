import { AdminUser, sequelize } from '../src/models';

async function audit() {
    try {
        console.log('--- Starting User Audit ---');
        const users = await AdminUser.findAll();

        users.forEach(u => {
            console.log(`[USER] ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | TenantID: ${u.tenantId || 'NULL'}`);
        });

        const orphans = users.filter(u => u.role !== 'SUPER_ADMIN' && !u.tenantId);
        console.log('\n--- Summary ---');
        console.log(`Total Users: ${users.length}`);
        console.log(`Orphaned Users (Non-SuperAdmin without Tenant): ${orphans.length}`);

        if (orphans.length > 0) {
            console.log('\n[!] CRITICAL: Found users in broken state.');
        } else {
            console.log('\n[✓] Data looks clean.');
        }

    } catch (e) {
        console.error('Audit failed:', e);
    } finally {
        await sequelize.close();
    }
}

audit();
