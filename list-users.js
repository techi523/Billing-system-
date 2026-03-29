const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

db.all("SELECT id, email, role, tenantId FROM admin_users", (err, rows) => {
    if (err) {
        console.error('DB_ERROR:', err.message);
    } else {
        console.log('USERS:', rows);
    }
    db.close();
});
