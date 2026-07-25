import axios from 'axios';

async function testProfileModule() {
    try {
        console.log('1. Authenticating as Tenant (mytenant@example.com)...');
        const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'mytenant@example.com',
            password: 'StagingAdmin123!'
        });

        const token = loginRes.data.token;
        console.log('✅ Authentication Successful!');

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        console.log('\n2. Testing GET /api/v1/admin/profile...');
        const profileRes = await axios.get('http://localhost:3000/api/v1/admin/profile', authHeader);
        console.log('✅ Profile GET Response Received!');
        console.log('   - Tenant Name:', profileRes.data.business.name);
        console.log('   - Profile Completion:', profileRes.data.dashboard.profileCompletionPercentage + '%');
        console.log('   - Available Balance:', profileRes.data.withdrawalBalances.availableBalanceFormatted);

        console.log('\n3. Testing PUT /api/v1/admin/profile/personal...');
        const updatePersonalRes = await axios.put('http://localhost:3000/api/v1/admin/profile/personal', {
            firstName: 'John',
            lastName: 'Tenant',
            displayName: 'John Tenant Admin',
            phone: '+254712345678',
            city: 'Nairobi',
            country: 'Kenya'
        }, authHeader);
        console.log('✅ Personal Info Update:', updatePersonalRes.data.message);

        console.log('\n4. Testing PUT /api/v1/admin/profile/business...');
        const updateBusinessRes = await axios.put('http://localhost:3000/api/v1/admin/profile/business', {
            tradingName: 'SurfBill SuperFast Fiber',
            businessRegistrationNumber: 'PVT-99887766',
            taxPin: 'P051998877Z',
            vatNumber: 'VAT-998877'
        }, authHeader);
        console.log('✅ Business Info Update:', updateBusinessRes.data.message);

        console.log('\n5. Testing PUT /api/v1/admin/profile/payment...');
        const updatePaymentRes = await axios.put('http://localhost:3000/api/v1/admin/profile/payment', {
            mpesaName: 'John Tenant (M-Pesa)',
            mpesaNumber: '0712345678',
            bankName: 'Equity Bank Kenya',
            bankBranch: 'Westlands',
            bankAccountName: 'SurfBill Fiber Enterprise',
            bankAccountNumber: '12349988776655',
            defaultWithdrawalMethod: 'MPESA'
        }, authHeader);
        console.log('✅ Payment Settings Update:', updatePaymentRes.data.message);

        console.log('\n6. Testing POST /api/v1/admin/profile/integrations/test...');
        const testIntRes = await axios.post('http://localhost:3000/api/v1/admin/profile/integrations/test', {
            integrationId: 'mpesa'
        }, authHeader);
        console.log('✅ Integration Test:', testIntRes.data.message);

        console.log('\n7. Testing GET /api/v1/admin/profile/activity...');
        const activityRes = await axios.get('http://localhost:3000/api/v1/admin/profile/activity', authHeader);
        console.log('✅ Activity Audit Log Count:', activityRes.data.logs.length);
        console.log('   - Recent Event:', activityRes.data.logs[0]?.action, '|', activityRes.data.logs[0]?.details);

        console.log('\n🎉 ALL PROFILE & ACCOUNT MANAGEMENT API TESTS PASSED SUCCESSFULLY!');
    } catch (e: any) {
        console.error('❌ Profile Module Test Error:', e.response?.data || e.message);
    }
}

testProfileModule();
