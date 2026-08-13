import fs from 'fs';
import path from 'path';
import { Client } from 'ssh2';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

const GENERATED_LOGO = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\dfa651ec-22d0-4f31-be9e-ca4d303a8113\\dravio_app_logo_1786616556381.png';

const targetLocalPaths = [
    'public/images/dravio-logo.png',
    'public/assets/dravio-logo.png',
    'frontend/public/dravio-logo.png',
    'frontend/src/assets/dravio-logo.png',
    'frontend/dist/assets/dravio-logo.png'
];

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

function uploadFileStream(conn: Client, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            const readStream = fs.createReadStream(localPath);
            const writeStream = sftp.createWriteStream(remotePath);
            writeStream.on('close', () => resolve());
            writeStream.on('error', (wErr: any) => reject(wErr));
            readStream.pipe(writeStream);
        });
    });
}

async function deployDravioLogo() {
    console.log('=== Copying Generated Dravio Logo to Local Workspace ===');

    if (!fs.existsSync(GENERATED_LOGO)) {
        console.error(`Generated logo file not found at ${GENERATED_LOGO}`);
        process.exit(1);
    }

    targetLocalPaths.forEach(relPath => {
        const fullPath = path.join(__dirname, '..', relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.copyFileSync(GENERATED_LOGO, fullPath);
        console.log(`✓ Copied to ${relPath}`);
    });

    const conn = new Client();
    conn.on('ready', async () => {
        console.log('\n=== SSH Connected to Production Server ===');

        await execSudo(conn, 'mkdir -p /srv/apps/billing-system/public/images /srv/apps/billing-system/frontend/dist/assets');
        await execSudo(conn, 'chown -R surfbill:surfbill /srv/apps/billing-system/public /srv/apps/billing-system/frontend/dist');

        console.log('Syncing Dravio logo to /srv/apps/billing-system/public/images/dravio-logo.png...');
        await uploadFileStream(conn, GENERATED_LOGO, '/srv/apps/billing-system/public/images/dravio-logo.png');

        console.log('Syncing Dravio logo to /srv/apps/billing-system/frontend/dist/assets/dravio-logo.png...');
        await uploadFileStream(conn, GENERATED_LOGO, '/srv/apps/billing-system/frontend/dist/assets/dravio-logo.png');

        console.log('✓ Dravio logo deployed live to production server!');
        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

deployDravioLogo();
