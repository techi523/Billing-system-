import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

const LOCAL_APK_PATH = path.join(__dirname, '../public/downloads/dravio-v1.4.0.apk');

function execSudo(conn: Client, cmd: string): Promise<string> {
    return new Promise((resolve) => {
        const fullCmd = `echo "${SERVER_PASS}" | sudo -S ${cmd}`;
        conn.exec(fullCmd, (err, stream) => {
            if (err) return resolve(`ERR: ${err.message}`);
            let stdout = '';
            let stderr = '';
            stream.on('data', (d: Buffer) => stdout += d.toString());
            stream.stderr.on('data', (d: Buffer) => stderr += d.toString());
            stream.on('close', () => resolve(stdout + stderr));
        });
    });
}

async function inspectApkAndHeaders() {
    console.log('=== Checking Local APK File Structure ===');
    if (fs.existsSync(LOCAL_APK_PATH)) {
        const stats = fs.statSync(LOCAL_APK_PATH);
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(LOCAL_APK_PATH, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);

        console.log(`Local APK Path: ${LOCAL_APK_PATH}`);
        console.log(`File Size: ${stats.size} bytes`);
        console.log(`Magic Header: 0x${buffer.toString('hex')} (ZIP Header PK\\x03\\x04 is 504b0304)`);
        const isValidZip = buffer.toString('hex') === '504b0304';
        console.log(`Is Valid ZIP/APK Header: ${isValidZip ? 'YES' : 'NO'}`);
    } else {
        console.error('Local APK file missing!');
    }

    const conn = new Client();
    conn.on('ready', async () => {
        console.log('\n=== SSH Connected to Production Server ===');

        const headersDirect = await execSudo(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
        console.log('\nNginx /downloads/ Headers:\n' + headersDirect);

        const headersApi = await execSudo(conn, 'curl -I http://127.0.0.1/api/v1/dravio/download/latest');
        console.log('\nAPI /api/v1/dravio/download/latest Headers:\n' + headersApi);

        // Check if unzip can list contents of the APK on the server
        const unzipTest = await execSudo(conn, 'unzip -l /srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk | head -n 15');
        console.log('\nAPK Internal Contents Check:\n' + unzipTest);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

inspectApkAndHeaders();
