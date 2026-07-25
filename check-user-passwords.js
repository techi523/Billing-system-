const { AdminUser } = require('./src/models');
const { sequelize } = require('./src/models');
const bcrypt = require('bcryptjs');

async function checkPasswords() {
    try {
        const users = await AdminUser.findAll();
        console.log(`Found ${users.length} users in database:\n`);

        const testPasswords = [
            'StagingAdmin123!',
            'admin123',
            'password123',
            'TestPass123!',
            'password'
        ];

        for (const user of users) {
            console.log(`User: ${user.email} (Role: ${user.role}, TenantId: ${user.tenantId})`);
            let matched = false;
            for (const pass of testPasswords) {
                if (user.password && await bcrypt.compare(pass, user.password)) {
                    console.log(`  ✅ Password matches: "${pass}"`);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                console.log(`  ❌ Password did not match any standard test password.`);
            }
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sequelize.close();
    }
}

checkPasswords();
