const { AdminUser } = require('./src/models');
const { sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function reset() {
    try {
        const email = 'superadmin@example.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const [user, created] = await AdminUser.findOrCreate({
            where: { email },
            defaults: {
                password: hashedPassword,
                role: 'SUPER_ADMIN'
            }
        });

        if (!created) {
            await user.update({
                password: hashedPassword,
                role: 'SUPER_ADMIN'
            });
            console.log(`Password reset for ${email}`);
        } else {
            console.log(`Super Admin ${email} created`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
reset();
