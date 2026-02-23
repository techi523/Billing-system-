const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

db.all('SELECT id, amount, status, failureReason, tenantId, routerId, createdAt FROM Payments ORDER BY createdAt DESC LIMIT 5', [], (err, rows) => {
    if (err) {
        console.error('DB_ERROR:', err.message);
    } else {
        console.log('RECENT_PAYMENTS:');
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
