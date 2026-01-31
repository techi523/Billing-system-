const { execSync } = require('child_process');
const path = require('path');

try {
    // Change to the project root directory
    process.chdir(path.resolve(__dirname, '..'));

    // Run the complete tenant fix script
    console.log('Running comprehensive tenant fix...');
    execSync('node scripts/complete-tenant-fix.js', { stdio: 'inherit' });

    console.log('Tenant fix completed successfully!');
    console.log('Next steps:');
    console.log('1. Run: node scripts/run-fix-tenant-data.js');
    console.log('2. Restart your server');
} catch (error) {
    console.error('Error running tenant fix:', error.message);
    process.exit(1);
}