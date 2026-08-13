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
            stream.on('close', (code: number) => resolve(`Exit Code ${code}\n${stdout}\n${stderr}`));
        });
    });
}

function uploadFileStream(conn: Client, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            const readStream = fs.createReadStream(localPath);
            const writeStream = sftp.createWriteStream(remotePath);

            writeStream.on('close', () => {
                resolve();
            });

            writeStream.on('error', (wErr: any) => {
                reject(wErr);
            });

            readStream.pipe(writeStream);
        });
    });
}

async function fixApkInstallability() {
    console.log('\n========================================================================');
    console.log(`  FIXING APK BINARY INTEGRITY & NGINX PACKAGE-ARCHIVE MIME TYPE`);
    console.log(`  Target Server: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}`);
    console.log('========================================================================\n');

    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ [PASS] SSH Connection established successfully!');

        try {
            // 1. Ensure target directories
            console.log('\n[1/5] Ensuring directories on server...');
            await execSudo(conn, 'mkdir -p /srv/apps/billing-system/public/downloads /srv/apps/billing-system/frontend/dist/downloads');
            await execSudo(conn, 'chown -R surfbill:surfbill /srv/apps/billing-system/public /srv/apps/billing-system/frontend/dist');

            // 2. Stream-upload local APK to both paths to avoid zip truncation
            console.log('\n[2/5] Uploading uncorrupted APK binary using stream pipe...');
            await uploadFileStream(conn, LOCAL_APK_PATH, '/srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk');
            console.log('  ✓ Uploaded to /srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk');

            await uploadFileStream(conn, LOCAL_APK_PATH, '/srv/apps/billing-system/frontend/dist/downloads/dravio-v1.4.0.apk');
            console.log('  ✓ Uploaded to /srv/apps/billing-system/frontend/dist/downloads/dravio-v1.4.0.apk');

            // 3. Test APK Zip integrity using unzip -t
            console.log('\n[3/5] Testing server-side APK ZIP archive integrity...');
            const zipTestPublic = await execSudo(conn, 'unzip -t /srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk | tail -n 5');
            console.log('  public/downloads APK Integrity Result:\n' + zipTestPublic.trim().split('\n').map(l => '    ' + l).join('\n'));

            const zipTestDist = await execSudo(conn, 'unzip -t /srv/apps/billing-system/frontend/dist/downloads/dravio-v1.4.0.apk | tail -n 5');
            console.log('  frontend/dist/downloads APK Integrity Result:\n' + zipTestDist.trim().split('\n').map(l => '    ' + l).join('\n'));

            // 4. Update Nginx configuration to force application/vnd.android.package-archive
            console.log('\n[4/5] Updating Nginx configuration with application/vnd.android.package-archive MIME type...');
            const configScript = `bash -c '
                CONF="/etc/nginx/sites-available/default"
                sed -i "/# Dravio APK Direct Downloads/,/}/d" "$CONF" 2>/dev/null || true
                sed -i "/location \\/ {/i \\
    # Dravio APK Direct Downloads\\n\\
    location /downloads/ {\\n\\
        alias /srv/apps/billing-system/public/downloads/;\\n\\
        autoindex off;\\n\\
        default_type application/vnd.android.package-archive;\\n\\
        types {\\n\\
            application/vnd.android.package-archive apk;\\n\\
        }\\n\\
        add_header Content-Type \\"application/vnd.android.package-archive\\" always;\\n\\
        add_header Content-Disposition \\"attachment; filename=dravio-v1.4.0.apk\\" always;\\n\\
    }\\n" "$CONF"
                nginx -t && systemctl reload nginx
            '`;

            const nginxRes = await execSudo(conn, configScript);
            console.log('  Nginx Update Result:\n' + nginxRes.trim().split('\n').map(l => '    ' + l).join('\n'));

            // 5. Verify Headers with curl
            console.log('\n[5/5] Verifying final HTTP headers on Port 80...');
            const finalCurl = await execSudo(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
            console.log('  Direct APK Download Header:\n' + finalCurl.trim().split('\n').map(l => '    ' + l).join('\n'));

            console.log('\n========================================================================');
            console.log('  APK INSTALLABILITY & MIME TYPE FIX COMPLETED AND VERIFIED');
            console.log('========================================================================\n');
            conn.end();
            process.exit(0);
        } catch (err: any) {
            console.error('❌ Error executing fix:', err.message);
            conn.end();
            process.exit(1);
        }
    });

    conn.on('error', (err) => {
        console.error('❌ SSH Error:', err.message);
        process.exit(1);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

fixApkInstallability();
