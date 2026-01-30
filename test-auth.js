const { AdminUser } = require('./src/models');
const { sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function testAuth() {
    try {
        const email = 'superadmin@example.com';
        const password = 'admin123';

        const user = await AdminUser.findOne({ where: { email, role: 'SUPER_ADMIN' } });
        if (!user) {
            console.log('User not found');
            return;
        }

        const match = await bcrypt.compare(password, user.password);
        console.log(`Email check: [${user.email}]`);
        console.log(`Password match for 'admin123': ${match}`);
        console.log(`Hash in DB: ${user.password}`);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
testAuth();
