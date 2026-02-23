const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

const tenantId = '3f56d321-21b8-49ee-9d6a-61e6027a966a';

db.get('SELECT id, name FROM Packages WHERE tenantId = ? LIMIT 1', [tenantId], (err, row) => {
    if (err) {
        console.error('DB_ERROR:', err.message);
    } else if (row) {
        console.log(`PACKAGE_INFO: id="${row.id}" name="${row.name}"`);
    } else {
        console.log('PACKAGE_NOT_FOUND');
    }
    db.close();
});
