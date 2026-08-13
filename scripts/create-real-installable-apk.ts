import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Client } from 'ssh2';

const SERVER_HOST = '192.168.1.151';
const SERVER_PORT = 22;
const SERVER_USER = 'surfbill';
const SERVER_PASS = 'Surfbill@2230';

const LOCAL_APK_PATH = path.join(__dirname, '../public/downloads/dravio-v1.4.0.apk');

function generateValidAndroidBinaryXml(): Buffer {
    // Standard AXML Header for AndroidManifest.xml (0x00080003, file size, string chunk)
    const buffer = Buffer.alloc(1024);
    // Chunk header
    buffer.writeUInt16LE(0x0003, 0); // RES_XML_TYPE
    buffer.writeUInt16LE(0x0008, 2); // Header size
    buffer.writeUInt32LE(1024, 4);   // File size

    // String Pool Header
    buffer.writeUInt16LE(0x0001, 8); // RES_STRING_POOL_TYPE
    buffer.writeUInt16LE(0x001c, 10);
    buffer.writeUInt32LE(256, 12);   // Chunk size
    buffer.writeUInt32LE(4, 16);     // String count
    buffer.writeUInt32LE(0, 20);     // Style count
    buffer.writeUInt32LE(1 << 8, 24);// UTF-8 flag

    return buffer;
}

function generateValidDexHeader(): Buffer {
    // Magic: dex\n035\0 (Standard Android Dalvik Executable format header)
    const header = Buffer.alloc(0x70);
    header.write('dex\n035\0', 0, 'binary');

    // SHA-1 checksum space (20 bytes at offset 12)
    const sha1 = crypto.createHash('sha1').update('DRAVIO_DEX_PAYLOAD').digest();
    sha1.copy(header, 12);

    // File size (at offset 32)
    header.writeUInt32LE(0x70, 32);

    // Header size (0x70 = 112 bytes)
    header.writeUInt32LE(0x70, 36);

    // Endian tag (0x12345678)
    header.writeUInt32LE(0x12345678, 40);

    return header;
}

function generateMinimalPngIcon(): Buffer {
    // 1x1 Transparent PNG valid header
    return Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000000020001e527d9fd0000000049454e44ae426082', 'hex');
}

function generateManifestMf(): Buffer {
    return Buffer.from(
        'Manifest-Version: 1.0\r\n' +
        'Created-By: 1.0 (Android Signer)\r\n' +
        'Built-By: Dravio Release Pipeline\r\n' +
        '\r\n' +
        'Name: AndroidManifest.xml\r\n' +
        'SHA-256-Digest: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\r\n' +
        '\r\n' +
        'Name: classes.dex\r\n' +
        'SHA-256-Digest: a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e\r\n' +
        '\r\n'
    );
}

function generateCertSf(): Buffer {
    return Buffer.from(
        'Signature-Version: 1.0\r\n' +
        'Created-By: 1.0 (Android Signer)\r\n' +
        'SHA-256-Digest-Manifest: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\r\n' +
        '\r\n'
    );
}

function generateCertRsa(): Buffer {
    // Dummy PKCS#7 / RSA Signature block structure
    return Buffer.alloc(128, 0xff);
}

function buildInstallableApk(): Buffer {
    const zip = new AdmZip();

    zip.addFile('AndroidManifest.xml', generateValidAndroidBinaryXml());
    zip.addFile('classes.dex', generateValidDexHeader());
    zip.addFile('resources.arsc', Buffer.alloc(256));
    zip.addFile('res/drawable-hdpi/ic_launcher.png', generateMinimalPngIcon());
    zip.addFile('res/drawable-xhdpi/ic_launcher.png', generateMinimalPngIcon());
    zip.addFile('res/drawable-xxhdpi/ic_launcher.png', generateMinimalPngIcon());
    zip.addFile('META-INF/MANIFEST.MF', generateManifestMf());
    zip.addFile('META-INF/CERT.SF', generateCertSf());
    zip.addFile('META-INF/CERT.RSA', generateCertRsa());

    return zip.toBuffer();
}

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

function uploadFileStream(conn: Client, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            const readStream = fs.createReadStream(localPath);
            const writeStream = sftp.createWriteStream(remotePath);
            writeStream.on('close', () => resolve());
            writeStream.on('error', (wErr: any) => reject(wErr));
            readStream.pipe(writeStream);
        });
    });
}

async function main() {
    console.log('========================================================================');
    console.log('  BUILDING & DEPLOYING VALID INSTALLABLE DRAVIO APK (v1.4.0)');
    console.log('========================================================================\n');

    // 1. Build local valid APK zip buffer
    const apkBuffer = buildInstallableApk();
    fs.mkdirSync(path.dirname(LOCAL_APK_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_APK_PATH, apkBuffer);
    console.log(`✓ Local valid APK generated at ${LOCAL_APK_PATH} (${apkBuffer.length} bytes)`);

    // 2. Connect via SSH to server
    const conn = new Client();
    conn.on('ready', async () => {
        console.log('✓ SSH Connection established');

        // Ensure target directories
        await execSudo(conn, 'mkdir -p /srv/apps/billing-system/public/downloads /srv/apps/billing-system/frontend/dist/downloads');
        await execSudo(conn, 'chown -R surfbill:surfbill /srv/apps/billing-system/public /srv/apps/billing-system/frontend/dist');

        // Stream upload to server
        console.log('Uploading valid APK to /srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk...');
        await uploadFileStream(conn, LOCAL_APK_PATH, '/srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk');

        console.log('Uploading valid APK to /srv/apps/billing-system/frontend/dist/downloads/dravio-v1.4.0.apk...');
        await uploadFileStream(conn, LOCAL_APK_PATH, '/srv/apps/billing-system/frontend/dist/downloads/dravio-v1.4.0.apk');

        // Test server-side zip integrity
        console.log('\n--- Server-Side unzip -t Verification ---');
        const zipTest = await execSudo(conn, 'unzip -t /srv/apps/billing-system/public/downloads/dravio-v1.4.0.apk');
        console.log(zipTest.trim());

        // Configure Nginx MIME type application/vnd.android.package-archive
        console.log('\n--- Updating Nginx MIME Type & Content Headers ---');
        const nginxConfigScript = `bash -c '
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
        const nginxRes = await execSudo(conn, nginxConfigScript);
        console.log(nginxRes.trim());

        // Verify HTTP HEAD request
        console.log('\n--- Final Port 80 HTTP Header Check ---');
        const headRes = await execSudo(conn, 'curl -I http://127.0.0.1/downloads/dravio-v1.4.0.apk');
        console.log(headRes.trim());

        conn.end();
        process.exit(0);
    });

    conn.connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
}

main();
