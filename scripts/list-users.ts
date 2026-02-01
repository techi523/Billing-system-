import { sequelize, AdminUser } from '../src/models';

async function listUsers() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const users = await AdminUser.findAll();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- Email: ${u.email}, Role: ${u.role}, TenantID: ${u.tenantId}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

listUsers();
