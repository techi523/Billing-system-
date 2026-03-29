const axios = require('axios');

async function testLoginValidation() {
    const baseUrl = 'http://localhost:3010/api/v1/auth/login';
    console.log(`Testing login validation against ${baseUrl}`);

    const testCases = [
        {
            name: 'Password shorter than 8 chars (should PASS validation)',
            data: { email: 'superadmin@example.com', password: 'abc' },
            expectedStatus: 401, // 401 means PASS validation (Invalid credentials), not 400 (Validation failed)
        },
        {
            name: 'Password without uppercase (should PASS validation)',
            data: { email: 'superadmin@example.com', password: 'admin123' },
            expectedStatus: 401,
        },
        {
            name: 'Empty password (should FAIL validation)',
            data: { email: 'superadmin@example.com', password: '' },
            expectedStatus: 400,
        },
        {
            name: 'Invalid email (should FAIL validation)',
            data: { email: 'not-an-email', password: 'TestPass123!' },
            expectedStatus: 400,
        }
    ];

    for (const testCase of testCases) {
        try {
            console.log(`\nRunning: ${testCase.name}`);
            const response = await axios.post(baseUrl, testCase.data);
            console.log(`Result: Success! (Unexpected for these cases, but status is ${response.status})`);
        } catch (error) {
            const actualStatus = error.response ? error.response.status : 'ERR';
            const errorData = error.response ? error.response.data : error.message;
            console.log(`Result: Got ${actualStatus}`);
            if (actualStatus === testCase.expectedStatus) {
                console.log('✅ Match expected status');
            } else {
                console.log(`❌ Expected ${testCase.expectedStatus}, but got ${actualStatus}`);
                console.log('Details:', JSON.stringify(errorData));
            }
        }
    }
}

testLoginValidation();
