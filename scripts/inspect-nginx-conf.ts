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

async function inspectNginxConf() {
    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        const sitesAvailable = await execCmd(conn, 'cat /etc/nginx/sites-available/* 2>/dev/null');
        console.log('--- Nginx sites-available ---\n' + sitesAvailable);

        const sitesEnabled = await execCmd(conn, 'cat /etc/nginx/sites-enabled/* 2>/dev/null');
        console.log('--- Nginx sites-enabled ---\n' + sitesEnabled);

        const localNginx = await execCmd(conn, 'cat /srv/apps/billing-system/nginx/* 2>/dev/null');
        console.log('--- Local nginx folder ---\n' + localNginx);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

inspectNginxConf();
