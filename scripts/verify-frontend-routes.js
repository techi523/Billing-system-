const http = require('http');

function check(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, length: data.length }));
        }).on('error', e => resolve({ error: e.message }));
    });
}

async function run() {
    console.log('Frontend /marketplace:', await check('http://localhost:5173/marketplace'));
    console.log('Frontend /app-center:', await check('http://localhost:5173/app-center'));
    console.log('Backend /marketplace redirect:', await check('http://localhost:3010/marketplace'));
}

run();
