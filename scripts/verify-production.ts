import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function verifySystem() {
    console.log('🚀 Starting Production Verification...');

    // 1. Health Check
    try {
        console.log('1. Checking System Health...');
        const health = await axios.get('http://localhost:3000/health');
        console.log('✅ Health Check Passed:', health.data);
    } catch (e: any) {
        console.error('❌ Health Check Failed:', e.message);
        process.exit(1);
    }

    // 2. Registration Test
    try {
        console.log('\n2. Testing Tenant Registration...');
        const uniqueSuffix = Math.floor(Math.random() * 10000);
        const payload = {
            email: `audit${uniqueSuffix}@test.com`,
            password: 'SecurePass123!',
            tenantName: `Audit ISP ${uniqueSuffix}`,
            subdomain: `audit${uniqueSuffix}`
        };
        
        const regRes = await axios.post(`${BASE_URL}/auth/register`, payload);
        console.log('✅ Registration Success:', regRes.status, regRes.data);
    } catch (e: any) {
        console.error('❌ Registration Failed:', e.response?.data || e.message);
        process.exit(1);
    }

    console.log('\n✅✅ SYSTEM VERIFICATION COMPLETE: ALL PRIMARY FLOWS OPERATIONAL');
}

verifySystem();
