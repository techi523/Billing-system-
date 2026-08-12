import { Client } from 'ssh2';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

function execCmd(conn: Client, cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let stdout = '';
            let stderr = '';
            stream.on('data', (d: Buffer) => stdout += d.toString());
            stream.stderr.on('data', (d: Buffer) => stderr += d.toString());
            stream.on('close', () => resolve(stdout + stderr));
        });
    });
}

async function inspectServer() {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        const pm2Info = await execCmd(conn, 'pm2 jlist');
        try {
            const apps = JSON.parse(pm2Info);
            const billingApp = apps.find((a: any) => a.name === 'billing-system');
            if (billingApp) {
                console.log('PM2 billing-system cwd:', billingApp.pm2_env?.pm_cwd);
                console.log('PM2 billing-system script:', billingApp.pm2_env?.pm_exec_path);
            }
        } catch (e) {
            console.log('pm2 jlist raw:', pm2Info);
        }

        const gitLocs = await execCmd(conn, 'find /home /root /var -name ".git" 2>/dev/null');
        console.log('Git repos on server:\n' + gitLocs.trim());

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

inspectServer();
