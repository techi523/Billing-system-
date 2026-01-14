import { sequelize, AdminUser } from './models';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import logger from './utils/logger';

dotenv.config();

async function initialSetup() {
    try {
        await sequelize.authenticate();
        logger.info('Connected to database for setup.');

        // 1. Create Super Admin if not exists
        const email = process.env.SUPER_ADMIN_EMAIL || 'admin@hotspot-saas.com';
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!password) {
            throw new Error('SUPER_ADMIN_PASSWORD must be set in environment variables');
        }

        const existingAdmin = await AdminUser.findOne({ where: { role: 'SUPER_ADMIN' } });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(password, 12);
            await AdminUser.create({
                email,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                tenantId: null,
                commissionRate: 0
            });
            logger.info('Super Admin created successfully.');
        } else {
            logger.info('Super Admin already exists.');
        }

        logger.info('Production system setup complete.');
        process.exit(0);
    } catch (err) {
        logger.error('Setup failed:', { error: (err as Error).message });
        process.exit(1);
    }
}

initialSetup();
