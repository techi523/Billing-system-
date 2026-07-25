const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');
db.all('SELECT email, role FROM AdminUsers', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
    db.close();
});
