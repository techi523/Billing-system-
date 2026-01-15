import { sequelize, AdminUser } from './models';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import logger from './utils/logger';

dotenv.config();

async function initialSetup() {
    try {
        await sequelize.authenticate();
        logger.info('Connected to database for setup.');

        // Force Sync to incorporate new models/fields
        await sequelize.sync({ alter: true });
        logger.info('Database schema updated.');

        // 1. Create Super Admin if not exists
        const email = process.env.SUPER_ADMIN_EMAIL || 'admin@surfbill.com';
        const password = process.env.SUPER_ADMIN_PASSWORD || 'SurfBill2026!';

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
        }

        // 2. Create Demo "SurfBill" Tenant
        const { Tenant, Package, Router: RouterModel, Subscriber, Payment, Voucher, Wallet } = require('./models');

        // Cleanup demo data
        await Tenant.destroy({ where: { subdomain: 'alpha' }, cascade: true });
        await Tenant.destroy({ where: { subdomain: 'demo' }, cascade: true });

        const tenant = await Tenant.create({
            id: 'demo-tenant-id-001',
            name: 'SurfBill Alpha Network',
            subdomain: 'demo',
            primaryColor: '#6366f1',
            status: 'ACTIVE',
            description: 'Premium High-Speed Internet for Nairobi and surroundings.',
            contactPhone: '0700000000'
        });

        // 3. Create Tenant Admin
        const adminPass = await bcrypt.hash('DemoAdmin123!', 12);
        await AdminUser.create({
            email: 'admin@demo-isp.com',
            password: adminPass,
            role: 'TENANT_ADMIN',
            tenantId: tenant.id
        });

        // 4. Routers
        const r1 = await RouterModel.create({ name: 'Node 01 - CBD', host: '197.10.20.1', username: 'api', password: 'password', tenantId: tenant.id });
        const r2 = await RouterModel.create({ name: 'Node 02 - Westlands', host: '197.10.20.2', username: 'api', password: 'password', tenantId: tenant.id });

        // 5. Packages
        const p1 = await Package.create({ name: '1 Hour Fast', price: 20, durationMinutes: 60, type: 'HOTSPOT', tenantId: tenant.id, isEnabled: true });
        const p2 = await Package.create({ name: '24 Hour Unlimited', price: 100, durationMinutes: 1440, type: 'HOTSPOT', tenantId: tenant.id, isEnabled: true });
        const p3 = await Package.create({ name: 'Home Fiber 20Mbps', price: 3500, durationMinutes: 43200, type: 'ISP', tenantId: tenant.id, isEnabled: true });

        // 6. Subscribers & Wallets
        const sub = await Subscriber.create({
            name: 'Maina Kamau',
            phoneNumber: '0711223344',
            pppoeUsername: 'mainan01',
            pppoePassword: 'pass',
            packageId: p3.id,
            routerId: r1.id,
            expiryDate: new Date(Date.now() + 864000000),
            tenantId: tenant.id
        });

        await Wallet.create({
            ownerId: sub.id,
            ownerType: 'SUBSCRIBER',
            balance: 1500,
            tenantId: tenant.id
        });

        // 7. Payments (History)
        for (let i = 0; i < 20; i++) {
            await Payment.create({
                phoneNumber: `072200000${i}`,
                amount: i % 3 === 0 ? 100 : 20,
                status: 'SUCCESS',
                mpesaReceiptNumber: `RCEIPTPAY${i}${Math.random().toString(36).substring(7).toUpperCase()}`,
                packageId: i % 3 === 0 ? p2.id : p1.id,
                tenantId: tenant.id,
                createdAt: new Date(Date.now() - (i * 3600000 * 3))
            });
        }

        // 8. Vouchers
        for (let i = 0; i < 15; i++) {
            await Voucher.create({
                code: `SBILL-${Math.random().toString(36).substring(7).toUpperCase()}`,
                packageId: p1.id,
                tenantId: tenant.id,
                status: 'AVAILABLE'
            });
        }

        logger.info('Commercial SaaS "SurfBill Alpha" working data initialized.');
        logger.info('Production system setup complete.');
        process.exit(0);
    } catch (err) {
        logger.error('Setup failed:', { error: (err as Error).message });
        process.exit(1);
    }
}

initialSetup();
