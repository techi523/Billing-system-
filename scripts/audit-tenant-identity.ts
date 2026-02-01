import { AdminUser, Tenant, sequelize } from '../src/models';

/**
 * Audit script to detect duplicate tenant records
 * Run this to identify any data integrity issues caused by the bug
 */
async function auditDuplicateTenants() {
    console.log('=== Tenant Identity Audit ===\n');

    try {
        // 1. Check for duplicate emails (should not exist due to unique constraint)
        console.log('1. Checking for duplicate email addresses...');
        const [duplicateEmails] = await sequelize.query(`
            SELECT email, COUNT(*) as count, GROUP_CONCAT(id) as user_ids
            FROM admin_users 
            GROUP BY email 
            HAVING COUNT(*) > 1
        `) as any;

        if (duplicateEmails.length > 0) {
            console.log(`   ⚠️  Found ${duplicateEmails.length} duplicate emails:`);
            duplicateEmails.forEach((row: any) => {
                console.log(`      - ${row.email}: ${row.count} accounts (IDs: ${row.user_ids})`);
            });
        } else {
            console.log('   ✅ No duplicate emails found');
        }

        // 2. Check for users with multiple tenantIds (shouldn't happen)
        console.log('\n2. Checking for users with inconsistent tenant assignments...');
        const usersWithMultipleTenants = await AdminUser.findAll({
            attributes: ['email', 'tenantId', 'id'],
            where: { role: 'TENANT' }
        });

        const emailToTenants = new Map<string, Set<string>>();
        usersWithMultipleTenants.forEach(user => {
            if (!emailToTenants.has(user.email)) {
                emailToTenants.set(user.email, new Set());
            }
            if (user.tenantId) {
                emailToTenants.get(user.email)!.add(user.tenantId);
            }
        });

        const problematicUsers = Array.from(emailToTenants.entries())
            .filter(([_, tenants]) => tenants.size > 1);

        if (problematicUsers.length > 0) {
            console.log(`   ⚠️  Found ${problematicUsers.length} users with multiple tenant associations:`);
            problematicUsers.forEach(([email, tenants]) => {
                console.log(`      - ${email}: ${tenants.size} different tenants`);
            });
        } else {
            console.log('   ✅ No users with multiple tenant associations');
        }

        // 3. Check for orphaned tenants (tenants with no users)
        console.log('\n3. Checking for orphaned tenants...');
        const allTenants = await Tenant.findAll();
        const orphanedTenants = [];

        for (const tenant of allTenants) {
            const userCount = await AdminUser.count({ where: { tenantId: tenant.id } });
            if (userCount === 0) {
                orphanedTenants.push(tenant);
            }
        }

        if (orphanedTenants.length > 0) {
            console.log(`   ⚠️  Found ${orphanedTenants.length} orphaned tenants (no users):`);
            orphanedTenants.forEach(t => {
                console.log(`      - ${t.name} (${t.subdomain}) - ID: ${t.id}`);
            });
        } else {
            console.log('   ✅ No orphaned tenants found');
        }

        // 4. Summary
        console.log('\n=== Audit Summary ===');
        console.log(`Total Tenants: ${allTenants.length}`);
        console.log(`Total Users: ${usersWithMultipleTenants.length}`);
        console.log(`Duplicate Emails: ${duplicateEmails.length}`);
        console.log(`Users with Multiple Tenants: ${problematicUsers.length}`);
        console.log(`Orphaned Tenants: ${orphanedTenants.length}`);

        if (duplicateEmails.length === 0 && problematicUsers.length === 0 && orphanedTenants.length === 0) {
            console.log('\n✅ Database integrity is GOOD. No issues found.');
        } else {
            console.log('\n⚠️  Database integrity issues detected. Manual cleanup may be required.');
        }

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the audit
auditDuplicateTenants()
    .then(() => {
        console.log('\nAudit complete.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
