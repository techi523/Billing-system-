import { Client } from 'ssh2';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

function execCmd(conn: Client, cmd: string): Promise<string> {
    return new Promise((resolve) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return resolve(`ERR: ${err.message}`);
            let stdout = '';
            let stderr = '';
            stream.on('data', (d: Buffer) => stdout += d.toString());
            stream.stderr.on('data', (d: Buffer) => stderr += d.toString());
            stream.on('close', () => resolve(stdout + stderr));
        });
    });
}

async function inspectServerNginx() {
    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        console.log('\n--- 1. Testing Express Direct Port 3010 Download Endpoint ---');
        const curl3010 = await execCmd(conn, 'curl -I http://127.0.0.1:3010/downloads/dravio-v1.4.0.apk');
        console.log(curl3010);

        console.log('\n--- 2. Testing Express Direct Port 3010 API Download Endpoint ---');
        const curlApi3010 = await execCmd(conn, 'curl -I http://127.0.0.1:3010/api/v1/dravio/download/latest');
        console.log(curlApi3010);

        console.log('\n--- 3. Testing Port 80 (Nginx/Apache) Download Endpoint ---');
        const curl80 = await execCmd(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
        console.log(curl80);

        console.log('\n--- 4. Nginx Configuration Files ---');
        const nginxConfig = await execCmd(conn, 'cat /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null');
        console.log(nginxConfig.substring(0, 3000));

        console.log('\n--- 5. Web Root Directories (/var/www/app, /srv/apps, etc.) ---');
        const webRoots = await execCmd(conn, 'ls -la /var/www/app /var/www/html /srv/apps/billing-system /home/surfbill/Desktop/Surfbill/Billing-system- 2>/dev/null');
        console.log(webRoots);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

inspectServerNginx();
