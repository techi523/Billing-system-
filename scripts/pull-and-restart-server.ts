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
            stream.on('close', (code: number) => {
                resolve(`Exit Code: ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
            });
        });
    });
}

async function pullAndRestartOnServer() {
    console.log('\n========================================================================');
    console.log(`  EXECUTING REMOTE GIT PULL & PM2 RESTART ON PRODUCTION SERVER`);
    console.log(`  Target Server: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}`);
    console.log('========================================================================\n');

    const conn = new Client();

    conn.on('ready', async () => {
        console.log('✓ [PASS] SSH Connection established successfully!');

        try {
            // Locate repository directory
            console.log(`\n[1/3] Locating repository path on server...`);
            const locateOut = await execCmd(conn, `
                if [ -d "/home/surfbill/Billing-system/.git" ]; then echo "/home/surfbill/Billing-system";
                elif [ -d "/root/Billing-System-/.git" ]; then echo "/root/Billing-System-";
                elif [ -d "/var/www/app/.git" ]; then echo "/var/www/app";
                else echo "NONE"; fi
            `);

            const repoPath = locateOut.split('\n').map(l => l.trim()).find(l => l.startsWith('/')) || '/home/surfbill/Billing-system';
            console.log(`  ✓ Found repository path: ${repoPath}`);

            // Step 2: Run git pull
            console.log(`\n[2/3] Pulling latest git updates from origin/main...`);
            const pullOut = await execCmd(conn, `cd ${repoPath} && git pull origin main`);
            console.log(pullOut.trim().split('\n').map(l => '    ' + l).join('\n'));

            // Step 3: PM2 Restart or startup
            console.log(`\n[3/3] Restarting server application via PM2...`);
            const pm2Out = await execCmd(conn, `
                cd ${repoPath} &&
                (pm2 restart billing-system || pm2 start src/server.ts --interpreter npx --interpreter-args "ts-node" --name billing-system) &&
                pm2 status
            `);
            console.log(pm2Out.trim().split('\n').map(l => '    ' + l).join('\n'));

            console.log('\n========================================================================');
            console.log('  SERVER UPDATE & PM2 RESTART COMPLETED SUCCESSFULLY');
            console.log('========================================================================\n');
            conn.end();
            process.exit(0);
        } catch (err: any) {
            console.error('❌ Server execution error:', err.message);
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

pullAndRestartOnServer();
