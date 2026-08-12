const http = require('http');

function checkEndpoint(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, location: res.headers.location, data: data.substring(0, 300) });
            });
        });
        req.on('error', (err) => {
            resolve({ error: err.message });
        });
    });
}

async function verifyAll() {
    console.log('--- Checking Dravio Marketplace Port 8000 ---');
    const port8000 = await checkEndpoint('http://localhost:8000/marketplace');
    console.log('Port 8000 Result:', port8000);
}

verifyAll();
