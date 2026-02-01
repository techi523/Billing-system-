import { sequelize, Tenant, AdminUser } from '../src/models';

async function findActiveTenant() {
    try {
        await sequelize.authenticate();
        const user = await AdminUser.findOne({ where: { email: 'admin@demoisp.com' } });
        if (user && user.tenantId) {
            const tenant = await Tenant.findByPk(user.tenantId);
            if (tenant) {
                console.log(`Found tenant: ${tenant.name} (${tenant.subdomain}) ID: ${tenant.id}`);
                return;
            }
        }

        const allTenants = await Tenant.findAll();
        if (allTenants.length > 0) {
            console.log(`Fallback: Using first tenant found: ${allTenants[0].name} (${allTenants[0].subdomain}) ID: ${allTenants[0].id}`);
        } else {
            console.log('No tenants found in the database.');
        }
    } catch (error) {
        console.error('Failed to find tenant:', error);
    } finally {
        await sequelize.close();
    }
}

findActiveTenant();
