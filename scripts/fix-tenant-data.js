const { AdminUser, Tenant, AuditLog } = require('../../models');
const logger = require('../../utils/logger');

async function fixTenantData() {
    try {
        // Find users with null tenantId that are not super admins
        const usersWithoutTenants = await AdminUser.findAll({
            where: {
                tenantId: null,
                role: { [require('sequelize').Op.ne]: 'SUPER_ADMIN' }
            }
        });

        console.log(`Found ${usersWithoutTenants.length} users without tenants`);

        for (const user of usersWithoutTenants) {
            try {
                // Create a default tenant for this user
                const tenant = await Tenant.create({
                    name: `${user.email}'s Workspace`,
                    subdomain: `${user.email.split('@')[0].toLowerCase()}-workspace`,
                    status: 'ACTIVE'
                });

                // Update user with tenantId
                await user.update({ tenantId: tenant.id });

                // Log the fix
                await AuditLog.create({
                    action: 'TENANT_AUTO_ASSIGNMENT',
                    details: `Auto-assigned tenant to user ${user.email}`,
                    userId: user.id,
                    tenantId: tenant.id
                });

                console.log(`Fixed user: ${user.email} -> Tenant: ${tenant.name}`);
            } catch (error) {
                console.error(`Failed to fix user ${user.email}:`, error.message);
            }
        }

        console.log('Tenant data cleanup completed');
    } catch (error) {
        console.error('Error during tenant data cleanup:', error);
    }
}

fixTenantData();