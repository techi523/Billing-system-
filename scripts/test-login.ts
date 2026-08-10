import axios from 'axios';

async function run() {
    console.log('Testing login with staging-tenantadmin@surfbill.com ...');
    try {
        const res = await axios.post('http://localhost:3000/api/v1/auth/login', {
            email: 'staging-tenantadmin@surfbill.com',
            password: 'StagingPassword123!'
        });
        console.log('Login response status:', res.status);
        console.log('Login response user:', JSON.stringify(res.data.user, null, 2));
    } catch (err: any) {
        console.error('Login failed:', err.response?.data || err.message);
    }
}

run();
