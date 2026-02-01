import { AdminUser, sequelize } from '../src/models';

async function cleanup() {
    try {
        console.log('--- Starting Data Integrity Cleanup ---');

        // Find users with NULL tenantId who are NOT Super Admins
        const orphans = await AdminUser.findAll({
            where: {
                role: { [require('sequelize').Op.ne]: 'SUPER_ADMIN' },
                tenantId: null
            }
        });

        console.log(`Found ${orphans.length} orphaned users.`);

        if (orphans.length > 0) {
            console.log('Cleaning up orphaned users (removing as they have no determined path)...');
            for (const user of orphans) {
                console.log(`Deleting orphaned user: ${user.email} (ID: ${user.id})`);
                await user.destroy();
            }
            console.log('Cleanup complete.');
        } else {
            console.log('No orphaned users found. Data is healthy.');
        }

        // Also ensure Super Admins have NULL tenantId (Enforce source of truth)
        const misconfiguredSuperAdmins = await AdminUser.findAll({
            where: {
                role: 'SUPER_ADMIN',
                tenantId: { [require('sequelize').Op.ne]: null }
            }
        });

        if (misconfiguredSuperAdmins.length > 0) {
            console.log(`Fixing ${misconfiguredSuperAdmins.length} misconfigured Super Admins...`);
            for (const user of misconfiguredSuperAdmins) {
                await user.update({ tenantId: null });
            }
            console.log('Super Admin sync complete.');
        }

    } catch (e) {
        console.error('Cleanup failed:', e);
    } finally {
        await sequelize.close();
    }
}

cleanup();
