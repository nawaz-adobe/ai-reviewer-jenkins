#!/usr/bin/env node

/**
 * Build script to generate QA team package
 * Creates a lightweight distribution with source files for traditional Jenkins deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🏗️  Building AI Review Job Package...');

// Clean and create output directory
const distDir = path.join(__dirname, '..', 'dist');
const jobPackageDir = path.join(distDir, 'ai-review-job');

// Clean entire dist directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(jobPackageDir, { recursive: true });

// Load main package.json
const mainPackageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

console.log('📄 Creating simple executable...');

// Just copy the main index.js and rename it to ai-review (keep it simple)
const indexJsPath = path.join(__dirname, '..', 'src', 'index.js');
const securityJsPath = path.join(__dirname, '..', 'src', 'security.js');

let indexContent = fs.readFileSync(indexJsPath, 'utf8');

// Fix the version reference for standalone use  
indexContent = indexContent.replace(
    "require('../package.json').version",
    `"${mainPackageJson.version}"`
);

// Fix the security require to be relative to the same directory
indexContent = indexContent.replace(
    "} = require('./security');",
    "} = require('./ai-security');"
);

// Create the main executable
const executablePath = path.join(jobPackageDir, 'ai-review');
fs.writeFileSync(executablePath, indexContent);
execSync(`chmod +x "${executablePath}"`);

// Copy security.js as ai-security.js  
const securityContent = fs.readFileSync(securityJsPath, 'utf8');
fs.writeFileSync(path.join(jobPackageDir, 'ai-security.js'), securityContent);

// No need to copy LICENSE and README - use root ones

// Calculate package size
const jobSize = getDirectorySize(jobPackageDir);

console.log(`✅ AI Review Job Package built successfully!`);
console.log(`📁 Location: dist/ai-review-job/ (${(jobSize / 1024).toFixed(1)}KB)`);
console.log(`📦 Files: ${countFiles(jobPackageDir)} (main executable + helper)`);
console.log(`📄 Ready for Jenkins! (assumes pre-configured environment)`);
console.log(`🧹 Simple: main executable with minimal dependencies!`);

function getDirectorySize(dirPath) {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            totalSize += getDirectorySize(filePath);
        } else {
            totalSize += fs.statSync(filePath).size;
        }
    }
    
    return totalSize;
}

function countFiles(dirPath) {
    let fileCount = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            fileCount += countFiles(filePath);
        } else {
            fileCount++;
        }
    }
    
    return fileCount;
}

function getSizeInfo(dirPath) {
    const size = getDirectorySize(dirPath);
    return `${(size / 1024).toFixed(1)}KB`;
}
