const { AdminUser } = require('./src/models');
const { sequelize } = require('./src/models');

async function check() {
    try {
        const users = await AdminUser.findAll();
        console.log('--- User Audit ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`Email: ${u.email}`);
            console.log(`Role: ${u.role}`);
            console.log(`TenantID: ${u.tenantId || 'NULL'}`);
            console.log('------------------');
        });

        const orphans = users.filter(u => u.role !== 'SUPER_ADMIN' && !u.tenantId);
        console.log(`Total Users: ${users.length}`);
        console.log(`Orphaned Users (Non-SuperAdmin without Tenant): ${orphans.length}`);

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
