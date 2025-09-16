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
    // Use recursive deletion compatible with Node.js 12
    const rimraf = (dir) => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    rimraf(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
            });
            fs.rmdirSync(dir);
        }
    };
    rimraf(distDir);
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

console.log('✅ Package built successfully!');
console.log(`📁 Location: dist/ai-review-job/`);
console.log(`📦 Files: ai-review (single executable file)`);
console.log(`🚀 Ready for Jenkins!`);
