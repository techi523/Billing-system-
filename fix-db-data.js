const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_saas_db.sqlite');

const tenantId = '3f56d321-21b8-49ee-9d6a-61e6027a966a';

db.serialize(() => {
    // 1. Enable production mode
    db.run('UPDATE Tenants SET isProduction = 1 WHERE id = ?', [tenantId], function (err) {
        if (err) console.error('UPDATE_TENANT_ERROR:', err.message);
        else console.log(`TENANT_UPDATED: id=${tenantId} rows_affected=${this.changes}`);
    });

    // 2. Find a valid package
    db.get('SELECT id, name FROM Packages WHERE tenantId = ? AND isEnabled = 1 LIMIT 1', [tenantId], (err, row) => {
        if (err) {
            console.error('FIND_PACKAGE_ERROR:', err.message);
        } else if (row) {
            console.log(`PACKAGE_FOUND: id="${row.id}" name="${row.name}"`);
        } else {
            console.log('NO_PACKAGE_FOR_TENANT');
            // List all packages just in case
            db.all('SELECT id, name, tenantId FROM Packages', (err, rows) => {
                console.log('ALL_PACKAGES:', rows);
            });
        }
    });
});
