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

async function verifyServerOnline() {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        console.log('\n--- 1. Testing Port 80 Nginx Proxy to Express Backend ---');
        const res1 = await execCmd(conn, 'curl -I http://127.0.0.1/api/v1/dravio/download/latest');
        console.log(res1);

        console.log('\n--- 2. Testing Direct Static APK Download ---');
        const res2 = await execCmd(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
        console.log(res2);

        console.log('\n--- 3. PM2 Process List ---');
        const res3 = await execCmd(conn, 'pm2 status');
        console.log(res3);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

verifyServerOnline();
