const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

const tenantId = '3f56d321-21b8-49ee-9d6a-61e6027a966a';

db.all('SELECT id, name FROM Routers WHERE tenantId = ?', [tenantId], (err, rows) => {
    if (err) {
        console.error('DB_ERROR:', err.message);
    } else {
        console.log('ROUTERS:', JSON.stringify(rows, null, 2));
    }
    db.close();
});
