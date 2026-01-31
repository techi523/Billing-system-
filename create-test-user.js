const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('hotspot_db.sqlite');

async function createTestUser() {
    console.log('Creating test user for tenant...');

    // Hash the password
    const password = 'TestPass123!';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Test tenant ID
    const tenantId = '1ef38173-e695-42a3-9b7d-c17ede59fcae';
    const email = 'test1769847612835@example.com';

    // Check if user already exists
    db.get('SELECT id FROM AdminUsers WHERE email = ?', [email], (err, row) => {
        if (err) {
            console.error('Error checking user:', err);
            return;
        }

        if (row) {
            console.log('Test user already exists');
        } else {
            // Create the test user
            db.run(
                'INSERT INTO AdminUsers (email, password, role, tenantId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    email,
                    hashedPassword,
                    'TENANT',
                    tenantId,
                    new Date().toISOString(),
                    new Date().toISOString()
                ],
                (err) => {
                    if (err) {
                        console.error('Error creating user:', err);
                    } else {
                        console.log('Test user created successfully!');
                        console.log(`Email: ${email}`);
                        console.log(`Password: ${password}`);
                        console.log(`Tenant ID: ${tenantId}`);
                    }
                    db.close();
                }
            );
        }
    });
}

createTestUser();