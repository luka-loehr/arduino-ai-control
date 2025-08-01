#!/usr/bin/env node

/**
 * Arduino Bridge Build Script
 * 
 * This script builds the Arduino Bridge for multiple platforms
 * and creates distributable packages.
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const BUILD_DIR = 'dist';
const PLATFORMS = [
    { name: 'windows', target: 'node18-win-x64', ext: '.exe' },
    { name: 'macos', target: 'node18-macos-x64', ext: '' },
    { name: 'linux', target: 'node18-linux-x64', ext: '' }
];

console.log('🔨 Arduino Bridge Build Script');
console.log('===============================\n');

async function main() {
    try {
        // Clean build directory
        await cleanBuildDir();
        
        // Install dependencies
        await installDependencies();
        
        // Build for each platform
        for (const platform of PLATFORMS) {
            await buildPlatform(platform);
        }
        
        // Create checksums
        await createChecksums();
        
        console.log('\n✅ Build completed successfully!');
        console.log(`📦 Distributables available in: ${BUILD_DIR}/`);
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

async function cleanBuildDir() {
    console.log('🧹 Cleaning build directory...');
    
    try {
        await fs.rmdir(BUILD_DIR, { recursive: true });
    } catch (error) {
        // Directory might not exist, that's ok
    }
    
    await fs.mkdir(BUILD_DIR, { recursive: true });
    console.log('✅ Build directory cleaned\n');
}

async function installDependencies() {
    console.log('📦 Installing dependencies...');
    
    return new Promise((resolve, reject) => {
        exec('npm install', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            console.log('✅ Dependencies installed\n');
            resolve();
        });
    });
}

async function buildPlatform(platform) {
    console.log(`🔨 Building for ${platform.name}...`);
    
    const outputName = `arduino-bridge-${platform.name}${platform.ext}`;
    const outputPath = path.join(BUILD_DIR, outputName);
    
    const command = `npx pkg . --targets ${platform.target} --output ${outputPath}`;
    
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Failed to build ${platform.name}:`, error);
                reject(error);
                return;
            }
            
            console.log(`✅ Built ${outputName}`);
            resolve();
        });
    });
}

async function createChecksums() {
    console.log('\n🔐 Creating checksums...');
    
    const files = await fs.readdir(BUILD_DIR);
    const checksums = [];
    
    for (const file of files) {
        if (file.endsWith('.exe') || (!file.includes('.') && file.startsWith('arduino-bridge'))) {
            const filePath = path.join(BUILD_DIR, file);
            const checksum = await calculateSHA256(filePath);
            checksums.push(`${checksum}  ${file}`);
            console.log(`📋 ${file}: ${checksum}`);
        }
    }
    
    const checksumFile = path.join(BUILD_DIR, 'checksums.txt');
    await fs.writeFile(checksumFile, checksums.join('\n') + '\n');
    
    console.log(`✅ Checksums saved to ${checksumFile}`);
}

async function calculateSHA256(filePath) {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

// Run the build
main();
