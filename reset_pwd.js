const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

async function resetPassword() {
    const db = new sqlite3.Database('hotspot_db.sqlite');
    const email = 'mytenant@example.com';
    const newPassword = 'password123';
    
    // Hash password exactly as the backend does
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    db.run('UPDATE admin_users SET password = ? WHERE email = ?', [hashedPassword, email], function(err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`Password reset for ${email}. Changes: ${this.changes}`);
        }
        db.close();
    });
}

resetPassword();
