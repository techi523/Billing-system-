const axios = require('axios');

async function verifyRouterFix() {
    const loginUrl = 'http://localhost:3010/api/v1/auth/login';
    const genUrl = 'http://localhost:3010/api/v1/admin/routers/generate-setup';
    
    // 1. Login
    console.log('Logging in...');
    let token = '';
    try {
        const loginRes = await axios.post(loginUrl, {
            email: 'chuagameshack195@gmail.com',
            password: 'Chuaga#2230'
        });
        token = loginRes.data.token;
        console.log('Login successful');
        console.log('User Data:', JSON.stringify(loginRes.data.user, null, 2));
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
        return;
    }

    // 2. Call generate-setup
    console.log('\nCalling generate-setup...');
    try {
        const genRes = await axios.post(genUrl, {
            name: 'Verification Router',
            host: '10.0.0.99', // dummy host
            version: 'v7',
            tenantId: '3f56d321-21b8-49ee-9d6a-61e6027a966a'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Response Status:', genRes.status);
        console.log('Success:', genRes.data.success);
        if (genRes.data.script) {
            console.log('✅ Script generated successfully!');
            console.log('Script Preview (first 100 bytes):', genRes.data.script.substring(0, 100));
        } else {
            console.error('❌ Script missing in response');
        }
        
    } catch (error) {
        console.error('❌ Generation endpoint failed:', error.response ? error.response.data : error.message);
    }
}

verifyRouterFix();
