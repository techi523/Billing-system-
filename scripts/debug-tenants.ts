import { sequelize, Tenant } from '../src/models';

async function listTenants() {
    try {
        await sequelize.authenticate();
        const tenants = await Tenant.findAll();
        console.log('Tenants in database:');
        tenants.forEach(t => {
            console.log(`- ID: ${t.id}, Name: ${t.name}, Subdomain: ${t.subdomain}`);
        });
    } catch (error) {
        console.error('Failed to list tenants:', error);
    } finally {
        await sequelize.close();
    }
}

listTenants();
