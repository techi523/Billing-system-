import { Client } from 'ssh2';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

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

async function fixNginxMimeApk() {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        const fixScript = `bash -c '
            # Add apk MIME type to /etc/nginx/mime.types if missing
            if ! grep -q "application/vnd.android.package-archive" /etc/nginx/mime.types; then
                sed -i "s/types {/types {\\n    application\\/vnd.android.package-archive apk;/g" /etc/nginx/mime.types
            fi

            # Configure /downloads/ in sites-available/billing-system
            for CONF in /etc/nginx/sites-available/default /etc/nginx/sites-available/billing-system; do
                if [ -f "$CONF" ]; then
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
                fi
            done

            nginx -t && systemctl reload nginx
        '`;

        const res = await execSudo(conn, fixScript);
        console.log('Nginx Reload Output:\n' + res);

        const checkCurl = await execSudo(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
        console.log('Final Header Output:\n' + checkCurl);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

fixNginxMimeApk();
