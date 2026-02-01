import axios from 'axios';

async function verifyDebug() {
    try {
        console.log('Checking Server Health...');
        const healthRes = await axios.get('http://localhost:3010/health');
        console.log('Health:', healthRes.data);

        console.log('Checking DB Config via Debug API...');
        const dbRes = await axios.get('http://localhost:3010/api/v1/debug/db');
        console.log('DB Config:', dbRes.data);

        console.log('Seeding templates via Debug API...');
        const seedRes = await axios.post('http://localhost:3010/api/v1/debug/seed-templates');
        console.log('Seed Result:', JSON.stringify(seedRes.data, null, 2));

    } catch (error: any) {
        console.error('Debug API Failed Status:', error.response?.status);
        console.error('Data:', error.response?.data);
    }
}

verifyDebug();
