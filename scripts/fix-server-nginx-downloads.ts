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

function sftpUpload(conn: Client, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            sftp.fastPut(localPath, remotePath, {}, (uErr) => {
                if (uErr) return reject(uErr);
                resolve();
            });
        });
    });
}

async function fixNginxDownloads() {
    console.log('\n========================================================================');
    console.log(`  APPLYING SERVER-SIDE NGINX UPSTREAM & DOWNLOAD ROUTING FIX`);
    console.log(`  Target Server: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}`);
    console.log('========================================================================\n');

    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ [PASS] SSH Connection established successfully!');

        try {
            // 1. Remove invalid conf.d file
            console.log('\n[1/5] Removing legacy conf files...');
            await execSudo(conn, 'rm -f /etc/nginx/conf.d/dravio-downloads.conf');

            // 2. Ensure directories & upload APKs
            console.log('\n[2/5] Uploading APK binary to frontend/dist/downloads and public/downloads...');
            await execSudo(conn, 'mkdir -p /srv/apps/billing-system/public/downloads /srv/apps/billing-system/frontend/dist/downloads');
            await execSudo(conn, 'chown -R surfbill:surfbill /srv/apps/billing-system/public /srv/apps/billing-system/frontend/dist');

            await sftpUpload(conn, LOCAL_APK_PATH, '/srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk');
            await sftpUpload(conn, LOCAL_APK_PATH, '/srv/apps/billing-system/frontend/dist/downloads/dravio-v1.4.0.apk');
            console.log('  ✓ [PASS] APK binaries uploaded to both download directories!');

            // 3. Fix Nginx Upstream port from 3000 to 3010 across site configs
            console.log('\n[3/5] Fixing Nginx upstream backend port to 3010 in site configs...');
            const updatePortScript = `bash -c '
                sed -i "s/server 127.0.0.1:3000;/server 127.0.0.1:3010;/g" /etc/nginx/sites-available/* /etc/nginx/sites-enabled/* 2>/dev/null || true
            '`;
            await execSudo(conn, updatePortScript);

            // 4. Inject location /downloads/ into /etc/nginx/sites-available/default
            console.log('\n[4/5] Injecting location /downloads/ into Nginx default site config...');
            const configScript = `bash -c '
                CONF="/etc/nginx/sites-available/default"
                if ! grep -q "location /downloads/" "$CONF"; then
                    sed -i "/location \\/ {/i \\
    # Dravio APK Direct Downloads\\n\\
    location /downloads/ {\\n\\
        alias /srv/apps/billing-system/public/downloads/;\\n\\
        autoindex off;\\n\\
        default_type application/vnd.android.package-archive;\\n\\
        add_header Content-Disposition \\"attachment; filename=dravio-v1.4.0.apk\\";\\n\\
    }\\n" "$CONF"
                fi
                nginx -t && systemctl reload nginx
            '`;

            const nginxRes = await execSudo(conn, configScript);
            console.log('  Nginx Test & Reload Result:\n' + nginxRes.trim().split('\n').map(l => '    ' + l).join('\n'));

            // 5. Test HTTP response headers on Port 80
            console.log('\n[5/5] Verifying HTTP response headers on Port 80...');
            const testCurl1 = await execSudo(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
            console.log('  Direct APK Download Header (Port 80):\n' + testCurl1.trim().split('\n').map(l => '    ' + l).join('\n'));

            const testCurl2 = await execSudo(conn, 'curl -I http://127.0.0.1/api/v1/dravio/download/latest');
            console.log('  API APK Stream Header (Port 80):\n' + testCurl2.trim().split('\n').map(l => '    ' + l).join('\n'));

            console.log('\n========================================================================');
            console.log('  SERVER-SIDE NGINX DOWNLOAD ROUTING & PORT 3010 FIX COMPLETE');
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

fixNginxDownloads();
