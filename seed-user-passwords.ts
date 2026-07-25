import { AdminUser } from './src/models';
import { sequelize } from './src/models';
import bcrypt from 'bcryptjs';

async function seedUserPasswords() {
    console.log('🔄 Resetting/seeding standard passwords for all accounts...');
    try {
        const defaultPassword = 'StagingAdmin123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const users = await AdminUser.findAll();
        console.log(`Found ${users.length} accounts in database:`);

        for (const user of users) {
            await user.update({ password: hashedPassword });
            console.log(`  ✅ Account: ${user.email} (Role: ${user.role}) -> Password set to: "${defaultPassword}"`);
        }

        console.log('\n🎉 Password reset complete! All registered accounts now use password: "StagingAdmin123!"');
    } catch (e: any) {
        console.error('❌ Failed to seed user passwords:', e.message);
    } finally {
        await sequelize.close();
    }
}

seedUserPasswords();
