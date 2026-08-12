const http = require('http');

function check(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            let size = 0;
            res.on('data', chunk => size += chunk.length);
            res.on('end', () => resolve({
                status: res.statusCode,
                contentType: res.headers['content-type'],
                disposition: res.headers['content-disposition'],
                sha256: res.headers['x-apk-sha256'],
                downloadedBytes: size
            }));
        });
        req.on('error', err => resolve({ error: err.message }));
    });
}

async function run() {
    console.log('Testing APK Download API:');
    const res1 = await check('http://localhost:3010/api/v1/dravio/download/latest');
    console.log('API Download Response:', res1);

    console.log('\nTesting Direct Static APK Link:');
    const res2 = await check('http://localhost:3010/downloads/dravio-v1.4.0.apk');
    console.log('Static APK Download Response:', res2);
}

run();
