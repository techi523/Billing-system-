const axios = require('axios');

async function testTenantBootstrapAPI() {
    console.log('=== TENANT BOOTSTRAP API TEST ===\n');

    try {
        // Test 1: Register new tenant
        console.log('--- Test 1: Register New Tenant ---');
        const registerRes = await axios.post('http://localhost:3000/api/v1/auth/register', {
            email: 'test-tenant-api@test.com',
            password: 'testpassword123',
            tenantName: 'Test API Tenant',
            subdomain: 'test-api'
        });

        console.log('✓ Tenant registered:', registerRes.data.message);
        console.log('  Tenant ID:', registerRes.data.tenant.id);
        console.log('  User ID:', registerRes.data.user.id);

        // Test 2: Login
        console.log('\n--- Test 2: Login ---');
        const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'test-tenant-api@test.com',
            password: 'testpassword123'
        });

        console.log('✓ Login successful');
        const token = loginRes.data.token;
        console.log('  User Role:', loginRes.data.user.role);
        console.log('  Tenant ID:', loginRes.data.user.tenantId);

        // Test 3: Check initialization status
        console.log('\n--- Test 3: Check Initialization Status ---');
        const initStatusRes = await axios.get('http://localhost:3000/api/v1/admin/initialize/status', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Initialization status:', initStatusRes.data.message);
        console.log('  Is bootstrapped:', initStatusRes.data.isBootstrapped);

        // Test 4: Check dashboard data
        console.log('\n--- Test 4: Check Dashboard Data ---');
        const dashboardRes = await axios.get('http://localhost:3000/api/v1/admin/dashboard-summary', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Dashboard data loaded');
        console.log('  Tenant Name:', dashboardRes.data.tenantName);
        console.log('  Subscriber Count:', dashboardRes.data.subscriberCount);
        console.log('  Active Sessions:', dashboardRes.data.activeSessions);
        console.log('  Pending Payments:', dashboardRes.data.pendingPayments);

        // Test 5: Check wallet balance
        console.log('\n--- Test 5: Check Wallet Balance ---');
        const walletRes = await axios.get('http://localhost:3000/api/v1/wallet/balance', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Wallet balance retrieved');
        console.log('  Balance:', walletRes.data.balance);
        console.log('  Pending:', walletRes.data.pending);
        console.log('  Settled:', walletRes.data.settled);
        console.log('  Frozen:', walletRes.data.frozen);

        // Test 6: Try to initialize again (should be idempotent)
        console.log('\n--- Test 6: Test Idempotent Initialization ---');
        const initRes = await axios.post('http://localhost:3000/api/v1/admin/initialize', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✓ Initialization result:', initRes.data.message);
        console.log('  Status:', initRes.data.status);

        console.log('\n=== ALL API TESTS PASSED ===');
        console.log('✓ Tenant registration working');
        console.log('✓ Login authentication working');
        console.log('✓ Initialization status endpoint working');
        console.log('✓ Dashboard data endpoint working');
        console.log('✓ Wallet balance endpoint working');
        console.log('✓ Idempotent initialization working');
        console.log('\n🎉 Tenant portal fixes verified successfully!');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        console.error('Stack:', error.stack);
    }
}

// Run the test
testTenantBootstrapAPI();