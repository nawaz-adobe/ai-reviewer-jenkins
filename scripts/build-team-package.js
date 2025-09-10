#!/usr/bin/env node

/**
 * Simple build script - just copy files for Jenkins
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️  Building Jenkins job package...');

// Paths
const distDir = path.join(__dirname, '..', 'dist');
const jobDir = path.join(distDir, 'ai-review-job');
const srcDir = path.join(__dirname, '..', 'src');

// Clean and create
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(jobDir, { recursive: true });

// Copy main script
console.log('📄 Copying main script...');
let indexContent = fs.readFileSync(path.join(srcDir, 'index.js'), 'utf8');

// Fix package.json reference
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
indexContent = indexContent.replace(
    "require('../package.json').version",
    `"${packageJson.version}"`
);

// Create executable
fs.writeFileSync(path.join(jobDir, 'ai-review'), indexContent);
execSync(`chmod +x "${path.join(jobDir, 'ai-review')}"`);

// Copy security module
console.log('📄 Copying security module...');
fs.copyFileSync(
    path.join(srcDir, 'security.js'),
    path.join(jobDir, 'security.js')
);

console.log('✅ Package built successfully!');
console.log(`📁 Location: dist/ai-review-job/`);
console.log(`📦 Files: ai-review (executable), security.js`);
console.log(`🚀 Ready for Jenkins!`);