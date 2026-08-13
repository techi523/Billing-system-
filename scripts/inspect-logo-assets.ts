import fs from 'fs';
import path from 'path';

const assets = [
    'frontend/public/dravio-icon.png',
    'frontend/src/assets/dravio-logo.png',
    'frontend/src/assets/logo-main.png',
    'frontend/src/assets/logo.png',
    'public/assets/dravio-logo.png',
    'public/downloads/dravio-v1.4.0.apk'
];

console.log('=== Inspection of Dravio Logo Assets ===');
assets.forEach(relPath => {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`✓ Found: ${relPath} (${stats.size} bytes)`);
    } else {
        console.log(`× Missing: ${relPath}`);
    }
});
