const http = require('http');

const req = http.get('http://127.0.0.1:8000/marketplace', (res) => {
    console.log('Status:', res.statusCode);
    console.log('Location Header:', res.headers.location);
});

req.on('error', (err) => {
    console.error('HTTP Request Error:', err);
});
