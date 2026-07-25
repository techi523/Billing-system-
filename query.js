const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');
db.all('SELECT id, email, role FROM users', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
    db.close();
});
