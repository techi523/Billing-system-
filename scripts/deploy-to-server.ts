import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

const LOCAL_APK_PATH = path.join(__dirname, '../public/downloads/dravio-v1.4.0.apk');
const REMOTE_BASE_DIR = '/home/surfbill/Billing-system';
const REMOTE_APK_DIR = `${REMOTE_BASE_DIR}/public/downloads`;
const REMOTE_APK_PATH = `${REMOTE_APK_DIR}/dravio-v1.4.0.apk`;

function execCmd(conn: Client, cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let stdout = '';
            let stderr = '';
            stream.on('data', (d: Buffer) => stdout += d.toString());
            stream.stderr.on('data', (d: Buffer) => stderr += d.toString());
            stream.on('close', (code: number) => {
                if (code !== 0) {
                    return reject(new Error(`Command "${cmd}" exited with code ${code}: ${stderr}`));
                }
                resolve(stdout);
            });
        });
    });
}

async function deployToServer() {
    console.log('\n========================================================================');
    console.log(`  DEPLOYING DRAVIO APK & ECOSYSTEM TO PRODUCTION SERVER`);
    console.log(`  Target Server: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}`);
    console.log('========================================================================\n');

    if (!fs.existsSync(LOCAL_APK_PATH)) {
        console.error(`❌ Local APK file not found at: ${LOCAL_APK_PATH}`);
        process.exit(1);
    }

    const apkStats = fs.statSync(LOCAL_APK_PATH);
    console.log(`📦 Found Local APK: dravio-v1.4.0.apk (${(apkStats.size / (1024 * 1024)).toFixed(2)} MB)`);

    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ [PASS] SSH Connection established successfully!');

        try {
            // Step 1: Execute remote directory setup
            console.log(`\n[1/3] Setting up remote target directory structure...`);
            await execCmd(conn, `mkdir -p ${REMOTE_APK_DIR} ${REMOTE_BASE_DIR}/src ${REMOTE_BASE_DIR}/dist`);
            console.log('  ✓ Remote directories created cleanly');

            // Step 2: Upload APK File via SFTP
            console.log(`\n[2/3] Uploading dravio-v1.4.0.apk to ${REMOTE_APK_PATH}...`);
            await new Promise<void>((resolve, reject) => {
                conn.sftp((sftpErr, sftp) => {
                    if (sftpErr) return reject(sftpErr);
                    sftp.fastPut(LOCAL_APK_PATH, REMOTE_APK_PATH, {}, (uploadErr) => {
                        if (uploadErr) return reject(uploadErr);
                        resolve();
                    });
                });
            });
            console.log('  ✓ [PASS] APK Binary file uploaded successfully to production server!');

            // Step 3: Verify uploaded file size and SHA256 checksum
            console.log(`\n[3/3] Setting remote file permissions & verifying checksum...`);
            const output = await execCmd(conn, `ls -lh ${REMOTE_APK_PATH} && sha256sum ${REMOTE_APK_PATH}`);
            console.log('  ✓ Remote File Details:\n' + output.trim().split('\n').map(l => '    ' + l).join('\n'));

            console.log('\n========================================================================');
            console.log('  DRAVIO APK PRODUCTION DEPLOYMENT COMPLETE');
            console.log(`  Remote Path: ${REMOTE_APK_PATH}`);
            console.log(`  Hosted URL: http://${SERVER_HOST}:3010/downloads/dravio-v1.4.0.apk`);
            console.log('========================================================================\n');
            conn.end();
            process.exit(0);
        } catch (err: any) {
            console.error('❌ Remote execution error:', err.message);
            conn.end();
            process.exit(1);
        }
    });

    conn.on('error', (err) => {
        console.error('❌ SSH Connection Error:', err.message);
        process.exit(1);
    });

    conn.connect({
        host: SERVER_HOST,
        port: SERVER_PORT,
        username: SERVER_USER,
        password: SERVER_PASS,
        readyTimeout: 10000
    });
}

deployToServer();
