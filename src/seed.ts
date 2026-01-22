import { sequelize, AdminUser, Tenant, Package, Router, Voucher, Wallet, PlatformWallet, PlatformFee } from './models';
import bcrypt from 'bcryptjs';

async function seed() {
    await sequelize.sync({ force: true });

    // 1. Create Super Admin
    const superAdminPassword = await bcrypt.hash('admin123', 10);
    await AdminUser.create({
        email: 'superadmin@example.com',
        password: superAdminPassword,
        role: 'SUPER_ADMIN'
    });

    // 2. Create Demo Tenant
    const demoTenant = await Tenant.create({
        name: 'Demo ISP',
        subdomain: 'demo',
        status: 'ACTIVE',
        mpesaShortcode: '174379', // Sandbox Shortcode
        mpesaPasskey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    });

    // 3. Create Tenant Admin
    const tenantAdminPassword = await bcrypt.hash('tenant123', 10);
    await AdminUser.create({
        email: 'admin@demoisp.com',
        password: tenantAdminPassword,
        role: 'TENANT_ADMIN',
        tenantId: demoTenant.id
    });

    // 4. Create Demo Router
    await Router.create({
        name: 'Main Hotspot',
        host: '192.168.88.1',
        port: 8728,
        username: 'admin',
        password: '',
        tenantId: demoTenant.id
    });

    // 5. Create Demo Agent
    const agentPassword = await bcrypt.hash('agent123', 10);
    const agent = await AdminUser.create({
        email: 'agent@demoisp.com',
        password: agentPassword,
        role: 'AGENT',
        tenantId: demoTenant.id,
        commissionRate: 0.1 // 10% Commission
    });

    // 6. Create Hotspot Packages for Tenant
    await Package.bulkCreate([
        { name: '1 Hour', price: 10, durationMinutes: 60, tenantId: demoTenant.id, type: 'HOTSPOT' },
        { name: '24 Hours', price: 50, durationMinutes: 1440, tenantId: demoTenant.id, type: 'HOTSPOT' },
        { name: '1 Week', price: 250, durationMinutes: 10080, tenantId: demoTenant.id, type: 'HOTSPOT' }
    ]);

    // 7. Create Vouchers for Agent to sell
    const hotspotPkg = await Package.findOne({ where: { tenantId: demoTenant.id, type: 'HOTSPOT' } });
    if (hotspotPkg) {
        const vouchers = [];
        for (let i = 0; i < 10; i++) {
            vouchers.push({
                code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                packageId: hotspotPkg.id,
                tenantId: demoTenant.id,
                status: 'AVAILABLE'
            });
        }
        await Voucher.bulkCreate(vouchers);
    }

    // 8. Initialize wallets
    await Wallet.create({
        ownerId: demoTenant.id,
        ownerType: 'TENANT',
        balance: 0,
        frozenBalance: 0,
        pendingBalance: 0,
        settledBalance: 0,
        currency: 'KES',
        tenantId: demoTenant.id
    });

    await PlatformWallet.create({
        balance: 0,
        pendingBalance: 0,
        currency: 'KES'
    });

    // 9. Set up platform fees
    await PlatformFee.create({
        feeType: 'TRANSACTION',
        feeValue: 10, // 10%
        isPercentage: true,
        minAmount: 0,
        maxAmount: 100,
        isActive: true,
        description: 'Standard transaction fee'
    });

    console.log('SaaS Database seeded with Super Admin, Demo Tenant, Agent, Vouchers, and Wallet System!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});