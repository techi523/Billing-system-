const { AdminUser } = require('./src/models');
const { sequelize } = require('./src/models');

async function check() {
    try {
        const users = await AdminUser.findAll();
        users.forEach(u => {
            console.log(`ID: [${u.id}], Email: [${u.email}], Role: [${u.role}], PwdHash: [${u.password.substring(0, 10)}...]`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
