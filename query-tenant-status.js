const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

db.get('SELECT id, name, isProduction FROM Tenants WHERE id = ?', ['3f56d321-21b8-49ee-9d6a-61e6027a966a'], (err, row) => {
    if (err) {
        console.error('DB_ERROR:', err.message);
    } else if (row) {
        console.log(`TENANT_INFO: id="${row.id}" name="${row.name}" isProduction=${row.isProduction}`);
    } else {
        console.log('TENANT_NOT_FOUND');
    }
    db.close();
});
