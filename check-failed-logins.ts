import { AuditLog } from './src/models';
import { sequelize } from './src/models';

async function checkFailedLogins() {
    try {
        const logs = await AuditLog.findAll({
            where: { action: ['FAILED_LOGIN', 'FAILED_SUPER_ADMIN_LOGIN', 'LOGIN'] },
            limit: 10
        });

        console.log(`\n📋 Recent Login Audit Trail (${logs.length} entries):`);
        for (const log of logs) {
            console.log(`- Action: ${log.action} | Details: ${log.details}`);
        }
    } catch (e: any) {
        console.error('Error fetching audit logs:', e.message);
    } finally {
        await sequelize.close();
    }
}

checkFailedLogins();
