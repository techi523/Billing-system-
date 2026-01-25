const { sequelize, Tenant } = require('./src/models');

async function testTenant() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Try to find tenant by subdomain
    const tenant = await Tenant.findOne({
      where: { subdomain: 'demo' }
    });

    if (tenant) {
      console.log('✅ Tenant found:', tenant.toJSON());
    } else {
      console.log('❌ Tenant not found by subdomain');
      
      // Try to find any tenant
      const allTenants = await Tenant.findAll();
      console.log('All tenants in database:', allTenants.length);
      allTenants.forEach(t => console.log('Tenant:', t.toJSON()));
      
      // Create a tenant if none exist
      if (allTenants.length === 0) {
        console.log('Creating demo tenant...');
        const newTenant = await Tenant.create({
          name: 'Demo ISP',
          subdomain: 'demo',
          status: 'ACTIVE',
          mpesaShortcode: '174379',
          mpesaPasskey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
        });
        console.log('✅ Tenant created:', newTenant.toJSON());
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testTenant();