const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

const tenantId = '3f56d321-21b8-49ee-9d6a-61e6027a966a';

db.run('UPDATE Tenants SET isProduction = 1 WHERE id = ?', [tenantId], function (err) {
    if (err) {
        console.error('UPDATE_ERROR:', err.message);
        process.exit(1);
    } else {
        console.log(`TENANT_UPDATED: id=${tenantId} rows_affected=${this.changes}`);
        db.close();
        process.exit(0);
    }
});
