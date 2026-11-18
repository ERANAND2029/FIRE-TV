/**
 * Family Watch Referee - Build Script
 * 
 * Prepares web assets for static deployment (Render Static Sites, Vercel, Netlify).
 * Syncs app/src/main/assets/www into public/ directory.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'app', 'src', 'main', 'assets', 'www');
const TARGET_DIR = path.join(__dirname, 'public');

console.log('[Build] Preparing static assets for web deployment...');
console.log(`[Build] Source: ${SOURCE_DIR}`);
console.log(`[Build] Target: ${TARGET_DIR}`);

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`[Build Error] Source directory not found: ${SOURCE_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Copy directory contents
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ Copied: ${entry.name}`);
    }
  }
}

copyDir(SOURCE_DIR, TARGET_DIR);

// Ensure config.js fallback exists in public
const targetConfig = path.join(TARGET_DIR, 'config.js');
const targetConfigExample = path.join(TARGET_DIR, 'config.example.js');
if (!fs.existsSync(targetConfig) && fs.existsSync(targetConfigExample)) {
  fs.copyFileSync(targetConfigExample, targetConfig);
  console.log('  ✓ Created public/config.js from config.example.js');
}

console.log('\n[Build] ✅ Web build completed successfully! Ready for Render deployment.');
