const { AuditLog } = require('./src/models');
const { sequelize } = require('./src/models');

async function checkLogs() {
    try {
        const logs = await AuditLog.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']]
        });
        logs.forEach(l => {
            console.log(`[${l.createdAt}] Action: ${l.action}, Details: ${l.details}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
checkLogs();
