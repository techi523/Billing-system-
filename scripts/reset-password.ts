import { sequelize, AdminUser } from '../src/models';
import bcrypt from 'bcryptjs';

async function resetPass() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const email = 'admin@demoisp.com';
        const newPass = 'tenant123';
        const hashedPassword = await bcrypt.hash(newPass, 10);

        const [updated] = await AdminUser.update({ password: hashedPassword }, {
            where: { email }
        });

        if (updated > 0) {
            console.log(`Password for ${email} reset successfully.`);
        } else {
            console.log(`User ${email} not found.`);
        }

    } catch (error) {
        console.error('Reset Failed:', error);
    } finally {
        await sequelize.close();
    }
}

resetPass();
