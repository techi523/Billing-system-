import axios from 'axios';

async function testTenantLogin() {
    try {
        console.log('Testing Tenant login with mytenant@example.com...');
        const res = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'mytenant@example.com',
            password: 'StagingAdmin123!'
        });

        console.log('✅ Login Successful!');
        console.log('User Role:', res.data.user.role);
        console.log('Tenant ID:', res.data.user.tenantId);
        console.log('JWT Token Length:', res.data.token.length);
    } catch (e: any) {
        console.error('❌ Login Failed:', e.response?.data || e.message);
    }
}

testTenantLogin();
