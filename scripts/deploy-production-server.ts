import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

const REMOTE_APP_DIR = '/srv/apps/billing-system';
const LOCAL_APK_PATH = path.join(__dirname, '../public/downloads/dravio-v1.4.0.apk');
const LOCAL_ENV_PATH = path.join(__dirname, '../.env');

function execCmd(conn: Client, cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let stdout = '';
            let stderr = '';
            stream.on('data', (d: Buffer) => stdout += d.toString());
            stream.stderr.on('data', (d: Buffer) => stderr += d.toString());
            stream.on('close', (code: number) => {
                if (code !== 0 && !cmd.includes('git pull')) {
                    return reject(new Error(`Command failed [Exit ${code}]: ${stderr || stdout}`));
                }
                resolve(stdout || stderr);
            });
        });
    });
}

async function syncDirectorySFTP(sftp: any, localDir: string, remoteDir: string) {
    if (!fs.existsSync(localDir)) return;
    const entries = fs.readdirSync(localDir, { withFileTypes: true });

    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const remotePath = `${remoteDir}/${entry.name}`;

        if (entry.isDirectory()) {
            await new Promise<void>((res) => {
                sftp.mkdir(remotePath, () => res());
            });
            await syncDirectorySFTP(sftp, localPath, remotePath);
        } else {
            await new Promise<void>((res, rej) => {
                sftp.fastPut(localPath, remotePath, {}, (err: any) => {
                    if (err) rej(err);
                    else res();
                });
            });
        }
    }
}

async function deployProductionServer() {
    console.log('\n========================================================================');
    console.log(`  COMPLETE PRODUCTION DEPLOYMENT & PM2 RESTART ON SERVER`);
    console.log(`  Target Server: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}`);
    console.log(`  Production App Path: ${REMOTE_APP_DIR}`);
    console.log('========================================================================\n');

    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ [PASS] SSH Connection established successfully!');

        try {
            // Step 1: Ensure directory structure
            console.log(`\n[1/6] Ensuring target directories on server...`);
            await execCmd(conn, `mkdir -p ${REMOTE_APP_DIR}/public/downloads ${REMOTE_APP_DIR}/dist ${REMOTE_APP_DIR}/src`);
            console.log('  ✓ Directories verified');

            // Step 2: Try Git pull on server if repository exists
            console.log(`\n[2/6] Checking git repository & pulling updates...`);
            const gitRes = await execCmd(conn, `cd ${REMOTE_APP_DIR} && git pull origin main`);
            console.log('  ' + gitRes.trim());

            // Step 3: Upload .env file to root and dist
            console.log(`\n[3/6] Syncing environment configuration (.env)...`);
            await new Promise<void>((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) return reject(err);
                    sftp.fastPut(LOCAL_ENV_PATH, `${REMOTE_APP_DIR}/.env`, {}, (e1: any) => {
                        if (e1) return reject(e1);
                        sftp.fastPut(LOCAL_ENV_PATH, `${REMOTE_APP_DIR}/dist/.env`, {}, (e2: any) => {
                            if (e2) return reject(e2);
                            resolve();
                        });
                    });
                });
            });
            console.log('  ✓ [PASS] Environment configuration (.env) synchronized!');

            // Step 4: SFTP Upload APK binary
            console.log(`\n[4/6] Syncing Dravio APK binary to ${REMOTE_APP_DIR}/public/downloads/...`);
            await new Promise<void>((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) return reject(err);
                    sftp.fastPut(LOCAL_APK_PATH, `${REMOTE_APP_DIR}/public/downloads/dravio-v1.4.0.apk`, {}, (uErr: any) => {
                        if (uErr) return reject(uErr);
                        sftp.fastPut(LOCAL_APK_PATH, `${REMOTE_APP_DIR}/frontend/dist/downloads/dravio-v1.4.0.apk`, {}, () => {
                            resolve();
                        });
                    });
                });
            });
            console.log('  ✓ [PASS] APK Binary uploaded and synchronized to production directory!');

            // Step 5: Upload built dist files
            console.log(`\n[5/6] Syncing compiled dist assets & src models to ${REMOTE_APP_DIR}...`);
            const localDist = path.join(__dirname, '../dist');
            await new Promise<void>((resolve, reject) => {
                conn.sftp(async (err, sftp) => {
                    if (err) return reject(err);
                    try {
                        await syncDirectorySFTP(sftp, localDist, `${REMOTE_APP_DIR}/dist`);
                        resolve();
                    } catch (sErr) {
                        reject(sErr);
                    }
                });
            });
            console.log('  ✓ [PASS] Compiled application code and models synchronized!');

            // Step 6: PM2 Restart
            console.log(`\n[6/6] Restarting PM2 process 'billing-system'...`);
            const pm2Res = await execCmd(conn, `
                cd ${REMOTE_APP_DIR} &&
                pm2 delete billing-system || true
                pm2 start dist/src/server.js --name billing-system --cwd ${REMOTE_APP_DIR} &&
                pm2 save &&
                pm2 status
            `);
            console.log('  ✓ PM2 Status Output:\n' + pm2Res.trim().split('\n').map(l => '    ' + l).join('\n'));

            // Test Health endpoint
            const healthOut = await execCmd(conn, 'curl -s http://127.0.0.1:3000/health || curl -s http://127.0.0.1:3010/health');
            console.log('  ✓ Server Health Verification:\n' + healthOut.trim().split('\n').map(l => '    ' + l).join('\n'));

            console.log('\n========================================================================');
            console.log('  PRODUCTION DEPLOYMENT & PM2 SERVICE RESTART COMPLETE');
            console.log(`  Server Endpoint: http://${SERVER_HOST}`);
            console.log(`  Hosted APK Direct Download: http://${SERVER_HOST}/downloads/dravio-v1.4.0.apk`);
            console.log('========================================================================\n');
            conn.end();
            process.exit(0);
        } catch (err: any) {
            console.error('❌ Deployment failure:', err.message);
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

deployProductionServer();
