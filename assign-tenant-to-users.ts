import { AdminUser, Tenant } from './src/models';
import { TenantBootstrapService } from './src/services/tenant-bootstrap.service';

async function assignTenantToUsers() {
    try {
        console.log('Ensuring default tenant exists and assigning to users...');

        let tenant = await Tenant.findOne({ where: { name: 'Default Tenant Workspace' } });
        if (!tenant) {
            tenant = await Tenant.create({
                name: 'Default Tenant Workspace',
                subdomain: 'default',
                status: 'ACTIVE',
                contactPhone: '+254712345678'
            });
        }

        const users = await AdminUser.findAll({ where: { role: ['TENANT', 'STAFF', 'AGENT'] } });
        for (const user of users) {
            if (!user.tenantId) {
                user.tenantId = tenant.id;
                await user.save();
                console.log(`Assigned Tenant ID ${tenant.id} to user ${user.email}`);
            }

            // Bootstrap tenant wallet and defaults
            await TenantBootstrapService.bootstrapNewTenant(tenant.id, user.email);
        }

        console.log('✅ Tenant assignment and bootstrap complete!');
    } catch (e: any) {
        console.error('❌ Tenant Assignment Error:', e.message);
    }
}

assignTenantToUsers();
