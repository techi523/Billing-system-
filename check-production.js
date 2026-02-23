const { Tenant, sequelize } = require('./src/models');

async function checkTenant() {
    try {
        await sequelize.authenticate();
        const tenant = await Tenant.findByPk('3f56d321-21b8-49ee-9d6a-61e6027a966a');
        if (tenant) {
            console.log(`TENANT_STATUS: isProduction=${tenant.isProduction} name=${tenant.name}`);
        } else {
            console.log('TENANT_NOT_FOUND');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTenant();
