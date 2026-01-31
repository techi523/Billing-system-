const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('hotspot_db.sqlite');

console.log('Checking test tenant users...');

db.all('SELECT id, email, role, tenantId FROM AdminUsers', (err, rows) => {
    if (err) {
        console.error('Error querying users:', err);
    } else {
        console.log('Test users found:');
        rows.forEach(row => {
            console.log(`- ID: ${row.id}, Email: ${row.email}, Role: ${row.role}, TenantId: ${row.tenantId}`);
        });
    }

    console.log('\nChecking all tenants...');
    db.all('SELECT id, name, subdomain FROM Tenants', (err, tenantRows) => {
        if (err) {
            console.error('Error querying tenants:', err);
        } else {
            console.log('Tenants found:');
            tenantRows.forEach(tenant => {
                console.log(`- ID: ${tenant.id}, Name: ${tenant.name}, Subdomain: ${tenant.subdomain}`);
            });
        }
        db.close();
    });
});