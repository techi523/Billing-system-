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

async function inspectPm2Logs() {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        const logs = await execCmd(conn, 'pm2 logs billing-system --lines 50 --nostream');
        console.log('--- PM2 Billing-System Error Logs ---\n' + logs);

        const pm2Status = await execCmd(conn, 'pm2 status');
        console.log('--- PM2 Status ---\n' + pm2Status);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

inspectPm2Logs();
