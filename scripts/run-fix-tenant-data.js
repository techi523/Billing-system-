const { execSync } = require('child_process');
const path = require('path');

try {
    // Change to the project root directory
    process.chdir(path.resolve(__dirname, '..'));

    // Run the fix tenant data script
    console.log('Running tenant data cleanup...');
    execSync('node scripts/fix-tenant-data.js', { stdio: 'inherit' });

    console.log('Tenant data cleanup completed successfully!');
    console.log('Next steps:');
    console.log('1. Restart your server');
} catch (error) {
    console.error('Error running tenant data cleanup:', error.message);
    process.exit(1);
}