import { AdminUser, Tenant, AuditLog, sequelize } from '../src/models';
import { Op } from 'sequelize';

async function migrate() {
    try {
        console.log('--- STARTING SAFE TENANT MIGRATION (TS) ---');

        // Ensure connection
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Find users without tenants who are NOT super admins
        const users = await AdminUser.findAll({
            where: {
                tenantId: { [Op.is]: null },
                role: { [Op.ne]: 'SUPER_ADMIN' }
            }
        });

        console.log(`Found ${users.length} users requiring tenant assignment.`);

        for (const user of users) {
            // Create a deterministic subdomain
            const baseSubdomain = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            let subdomain = baseSubdomain;
            let counter = 1;

            // Ensure uniqueness
            while (await Tenant.findOne({ where: { subdomain } })) {
                subdomain = `${baseSubdomain}${counter++}`;
            }

            const tenant = await Tenant.create({
                name: `${user.email.split('@')[0]}'s Workspace`,
                subdomain: subdomain,
                status: 'ACTIVE'
            });

            await user.update({ tenantId: tenant.id });

            await AuditLog.create({
                action: 'MIGRATION_AUTO_TENANT',
                details: `Auto-assigned tenant ${tenant.subdomain} to user ${user.email} during migration fix`,
                userId: user.id,
                tenantId: tenant.id
            });

            console.log(`✅ FIXED: ${user.email} -> ${subdomain}`);
        }

        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
