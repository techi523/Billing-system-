const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_saas_db.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('DB_ERROR:', err.message);
    } else {
        console.log('TABLES:', rows.map(r => r.name));
    }
    db.close();
});
