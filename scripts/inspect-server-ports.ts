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

async function inspectPorts() {
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('✓ SSH connected');

        const listeningPorts = await execSudo(conn, 'ss -tlpn || netstat -tlpn');
        console.log('--- Listening Ports ---\n' + listeningPorts);

        const curl3000 = await execSudo(conn, 'curl -s http://127.0.0.1:3000/health');
        console.log('Curl 3000 health:\n' + curl3000);

        const curl3010 = await execSudo(conn, 'curl -s http://127.0.0.1:3010/health');
        console.log('Curl 3010 health:\n' + curl3010);

        const envFile = await execSudo(conn, 'cat /srv/apps/billing-system/.env');
        console.log('--- .env on server ---\n' + envFile);

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

inspectPorts();
