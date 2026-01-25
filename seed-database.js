const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database configuration
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './hotspot_db.sqlite',
    logging: false
});

// Define models (simplified for seeding)
const AdminUser = sequelize.define('AdminUser', {
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'AGENT'),
        allowNull: false
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

const Tenant = sequelize.define('Tenant', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subdomain: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
        defaultValue: 'ACTIVE'
    },
    mpesaShortcode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mpesaPasskey: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

const Package = sequelize.define('Package', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('HOTSPOT', 'ISP'),
        allowNull: false
    }
});

async function seedDatabase() {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synced successfully');

        // Create Super Admin
        const superAdminPassword = await bcrypt.hash('admin123', 10);
        const superAdmin = await AdminUser.create({
            email: 'superadmin@example.com',
            password: superAdminPassword,
            role: 'SUPER_ADMIN'
        });
        console.log('Super Admin created:', superAdmin.email);

        // Create Demo Tenant
        const demoTenant = await Tenant.create({
            name: 'Demo ISP',
            subdomain: 'demo',
            status: 'ACTIVE',
            mpesaShortcode: '174379',
            mpesaPasskey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
        });
        console.log('Demo Tenant created:', demoTenant.name);

        // Create Tenant Admin
        const tenantAdminPassword = await bcrypt.hash('tenant123', 10);
        const tenantAdmin = await AdminUser.create({
            email: 'admin@demoisp.com',
            password: tenantAdminPassword,
            role: 'TENANT_ADMIN',
            tenantId: demoTenant.id
        });
        console.log('Tenant Admin created:', tenantAdmin.email);

        // Create Hotspot Packages
        const packages = [
            { name: '1 Hour', price: 10, durationMinutes: 60, tenantId: demoTenant.id, type: 'HOTSPOT' },
            { name: '24 Hours', price: 50, durationMinutes: 1440, tenantId: demoTenant.id, type: 'HOTSPOT' },
            { name: '1 Week', price: 250, durationMinutes: 10080, tenantId: demoTenant.id, type: 'HOTSPOT' }
        ];

        await Package.bulkCreate(packages);
        console.log('Packages created for tenant');

        console.log('\n✅ Database seeded successfully!');
        console.log('Super Admin: superadmin@example.com / admin123');
        console.log('Tenant Admin: admin@demoisp.com / tenant123');
        console.log('Tenant: Demo ISP');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await sequelize.close();
    }
}

seedDatabase();