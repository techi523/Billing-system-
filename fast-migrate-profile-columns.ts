import { sequelize } from './src/models';

async function migrateProfileColumns() {
    try {
        console.log('Migrating profile columns & tables...');

        const tenantColumns = [
            `ALTER TABLE tenants ADD COLUMN tradingName VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN businessLogoUrl TEXT;`,
            `ALTER TABLE tenants ADD COLUMN vatNumber VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN website VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN businessEmail VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN businessAddress TEXT;`,
            `ALTER TABLE tenants ADD COLUMN supportEmail VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN supportPhone VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN loginLogoUrl TEXT;`,
            `ALTER TABLE tenants ADD COLUMN portalLogoUrl TEXT;`,
            `ALTER TABLE tenants ADD COLUMN faviconUrl TEXT;`,
            `ALTER TABLE tenants ADD COLUMN themeColor VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN secondaryColor VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN mpesaWithdrawalName VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN mpesaWithdrawalNumber VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN bankIban VARCHAR(255);`,
            `ALTER TABLE tenants ADD COLUMN defaultWithdrawalMethod VARCHAR(255) DEFAULT 'MPESA';`,
            `ALTER TABLE tenants ADD COLUMN notificationPreferences TEXT;`
        ];

        for (const query of tenantColumns) {
            try {
                await sequelize.query(query);
            } catch (e: any) {
                // Column already exists, ignore
            }
        }

        const adminUserColumns = [
            `ALTER TABLE admin_users ADD COLUMN firstName VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN lastName VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN displayName VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN username VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN phone VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN altPhone VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN preferredLanguage VARCHAR(255) DEFAULT 'en';`,
            `ALTER TABLE admin_users ADD COLUMN timeZone VARCHAR(255) DEFAULT 'Africa/Nairobi';`,
            `ALTER TABLE admin_users ADD COLUMN country VARCHAR(255) DEFAULT 'Kenya';`,
            `ALTER TABLE admin_users ADD COLUMN countyState VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN city VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN postalCode VARCHAR(255);`,
            `ALTER TABLE admin_users ADD COLUMN physicalAddress TEXT;`,
            `ALTER TABLE admin_users ADD COLUMN profilePhotoUrl TEXT;`,
            `ALTER TABLE admin_users ADD COLUMN twoFactorEnabled TINYINT(1) DEFAULT 0;`,
            `ALTER TABLE admin_users ADD COLUMN twoFactorMethod VARCHAR(255) DEFAULT 'EMAIL';`,
            `ALTER TABLE admin_users ADD COLUMN lastPasswordChange DATETIME;`
        ];

        for (const query of adminUserColumns) {
            try {
                await sequelize.query(query);
            } catch (e: any) {
                // Column already exists, ignore
            }
        }

        // Sync new models (tenant_documents and tenant_withdrawals)
        await sequelize.sync({ force: false });

        console.log('✅ Profile schema columns & tables migrated successfully!');
    } catch (e: any) {
        console.error('❌ Migration Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

migrateProfileColumns();
