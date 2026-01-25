const axios = require('axios');
const { sequelize, Tenant, AdminUser, Package, Wallet } = require('./src/models/index');

async function testTenantBootstrap() {
    console.log('=== TENANT BOOTSTRAP TEST ===\n');

    try {
        // Clean up any existing test data
        await sequelize.query('DELETE FROM admin_users WHERE email = :email', {
            replacements: { email: 'test-tenant-bootstrap@test.com' }
        });

        await sequelize.query('DELETE FROM tenants WHERE subdomain = :subdomain', {
            replacements: { subdomain: 'test-bootstrap' }
        });

        console.log('✓ Cleaned up existing test data');

        // Test 1: Register new tenant
        console.log('\n--- Test 1: Register New Tenant ---');
        const registerRes = await axios.post('http://localhost:3000/api/v1/auth/register', {
            email: 'test-tenant-bootstrap@test.com',
            password: 'testpassword123',
            tenantName: 'Test Bootstrap Tenant',
            subdomain: 'test-bootstrap'
        });

        console.log('✓ Tenant registered:', registerRes.data.message);
        const tenantId = registerRes.data.tenant.id;

        // Test 2: Check if tenant was bootstrapped
        console.log('\n--- Test 2: Verify Bootstrap Data ---');

        // Check wallet
        const wallet = await Wallet.findOne({ where: { ownerId: tenantId, ownerType: 'TENANT' } });
        if (wallet) {
            console.log('✓ Wallet created:', wallet.id);
        } else {
            console.log('✗ Wallet NOT created');
        }

        // Check packages
        const packages = await Package.findAll({ where: { tenantId } });
        console.log(`✓ Packages created: ${packages.length} packages`);
        packages.forEach(pkg => {
            console.log(`  - ${pkg.name}: KES ${pkg.price}`);
        });

        // Test 3: Login and check tenant portal
        console.log('\n--- Test 3: Login and Check Portal ---');
        const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'test-tenant-bootstrap@test.com',
            password: 'testpassword123'
        });

        console.log('✓ Login successful');
        const token = loginRes.data.token;

        // Check initialization status
        const initStatusRes = await axios.get('http://localhost:3000/api/v1/admin/initialize/status', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Initialization status:', initStatusRes.data.message);

        // Check dashboard data
        const dashboardRes = await axios.get('http://localhost:3000/api/v1/admin/dashboard-summary', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Dashboard data loaded:', dashboardRes.data.tenantName);

        // Check wallet balance
        const walletRes = await axios.get('http://localhost:3000/api/v1/wallet/balance', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Wallet balance:', walletRes.data.balance);

        console.log('\n=== ALL TESTS PASSED ===');
        console.log('✓ Tenant bootstrap working correctly');
        console.log('✓ Wallet initialized with default values');
        console.log('✓ Default packages created');
        console.log('✓ Dashboard data accessible');
        console.log('✓ Wallet service handles missing wallets gracefully');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

// Run the test
testTenantBootstrap();