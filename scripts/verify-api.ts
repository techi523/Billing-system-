import axios from 'axios';

async function verify() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3010/api/v1/auth/login', {
            email: 'admin@demoisp.com',
            password: 'tenant123'
        });

        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        console.log('Fetching templates from API...');
        const templatesRes = await axios.get('http://localhost:3010/api/v1/campaigns/templates', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`API returned ${templatesRes.data.length} templates:`);
        templatesRes.data.forEach((t: any) => {
            console.log(`- ${t.name} (${t.status})`);
        });

    } catch (error: any) {
        console.error('API Verification Failed:', error.response?.data || error.message);
    }
}

verify();
