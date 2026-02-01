import { sequelize } from '../src/models';
import path from 'path';
import fs from 'fs';

async function diagnose() {
    console.log('CWD:', process.cwd());
    console.log('Resolved path for ./hotspot_db.sqlite:', path.resolve('./hotspot_db.sqlite'));

    // Check if file exists
    const dbPath = path.resolve('./hotspot_db.sqlite');
    if (fs.existsSync(dbPath)) {
        console.log('DB File exists. Size:', fs.statSync(dbPath).size, 'bytes');
    } else {
        console.log('DB File DOES NOT EXIST at this path!');
    }

    // Check sequelize options
    const options = (sequelize as any).options;
    console.log('Sequelize storage config:', options.storage);
    console.log('Sequelize dialect:', options.dialect);

    await sequelize.close();
}

diagnose();
