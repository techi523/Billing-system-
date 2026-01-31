const axios = require('axios');

const BASE_URL = 'http://localhost:3010/api/v1/auth';

// LOAD FROM ENV (Mocking for script)
const SUPER_ADMIN = {
    email: 'chuagameshack195@gmail.com',
    password: 'Chuaga#2230'
};

async function testSuperAdminLogin() {
    console.log('\n--- TESTING SUPER ADMIN LOGIN ---');
    try {
        const res = await axios.post(`${BASE_URL}/superadmin/login`, {
            email: SUPER_ADMIN.email,
            password: SUPER_ADMIN.password,
            ip: '127.0.0.1'
        });
        console.log('✅ Super Admin Login Success');
        console.log('Token:', res.data.token ? 'PRESENT' : 'MISSING');
        console.log('Role:', res.data.user.role);
        return res.data.token;
    } catch (e) {
        if (e.response) {
            console.error('❌ Super Admin Login Failed Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data));
        } else {
            console.error('❌ Super Admin Login Error:', e.message);
        }
        return null;
    }
}

async function testRegistration() {
    console.log('\n--- TESTING REGISTRATION ---');
    const random = Math.floor(Math.random() * 10000);
    const payload = {
        email: `test_tenant_${random}@example.com`,
        password: 'Password123!',
        tenantName: `Test Tenant ${random}`,
        subdomain: `test${random}`
    };

    try {
        const res = await axios.post(`${BASE_URL}/register`, payload);
        console.log('✅ Registration Success');
        console.log('User ID:', res.data.user.id);
        console.log('Tenant:', res.data.tenant.name);
        return payload;
    } catch (e) {
        if (e.response) {
            console.error('❌ Registration Failed Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data));
        } else {
            console.error('❌ Registration Failed Error:', e.message);
        }
        return null;
    }
}

async function run() {
    await testSuperAdminLogin();
    await testRegistration();
}

run();
