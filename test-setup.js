#!/usr/bin/env node

// Arduino AI Control System - Setup Test Script

const fs = require('fs');
const path = require('path');

console.log('🧪 Arduino AI Control System - Setup Test');
console.log('==========================================\n');

let allTestsPassed = true;

// Test 1: Check Node.js version
console.log('1. Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 14) {
    console.log(`   ✅ Node.js ${nodeVersion} (OK)`);
} else {
    console.log(`   ❌ Node.js ${nodeVersion} (Requires v14 or higher)`);
    allTestsPassed = false;
}

// Test 2: Check project structure
console.log('\n2. Checking project structure...');
const requiredFiles = [
    'arduino-control-app/server.js',
    'arduino-control-app/package.json',
    'arduino-control-app/public/index.html',
    'arduino-control-app/arduino-serial/arduino-serial.ino'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} (Missing)`);
        allTestsPassed = false;
    }
});

// Test 3: Check dependencies
console.log('\n3. Checking dependencies...');
const packageJsonPath = 'arduino-control-app/package.json';
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = [
        '@google/generative-ai',
        'express',
        'serialport',
        '@serialport/parser-readline',
        'dotenv'
    ];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`   ✅ ${dep}`);
        } else {
            console.log(`   ❌ ${dep} (Missing from package.json)`);
            allTestsPassed = false;
        }
    });
}

// Test 4: Check if dependencies are installed
console.log('\n4. Checking installed dependencies...');
const nodeModulesPath = 'arduino-control-app/node_modules';
if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules directory exists');
} else {
    console.log('   ⚠️  node_modules not found. Run: npm install');
}

// Test 5: Check environment configuration
console.log('\n5. Checking environment configuration...');
const envPath = 'arduino-control-app/.env';
const envExamplePath = 'arduino-control-app/.env.example';

if (fs.existsSync(envExamplePath)) {
    console.log('   ✅ .env.example exists');
} else {
    console.log('   ❌ .env.example missing');
    allTestsPassed = false;
}

if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('GOOGLE_API_KEY=') && !envContent.includes('your_api_key_here')) {
        console.log('   ✅ Google API key appears to be configured');
    } else {
        console.log('   ⚠️  Google API key needs to be configured in .env');
    }
} else {
    console.log('   ⚠️  .env file not found. Copy from .env.example and configure');
}

// Test 6: Check for Arduino devices (Linux only)
console.log('\n6. Checking for Arduino devices...');
if (process.platform === 'linux') {
    const possiblePorts = ['/dev/ttyACM0', '/dev/ttyUSB0', '/dev/ttyACM1', '/dev/ttyUSB1'];
    let foundDevice = false;
    
    possiblePorts.forEach(port => {
        if (fs.existsSync(port)) {
            console.log(`   ✅ Found device at ${port}`);
            foundDevice = true;
        }
    });
    
    if (!foundDevice) {
        console.log('   ⚠️  No Arduino devices found. Please connect your Arduino.');
    }
} else {
    console.log('   ℹ️  Arduino device check skipped (not on Linux)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
    console.log('🎉 All tests passed! Your setup looks good.');
    console.log('\nNext steps:');
    console.log('1. Upload arduino-serial.ino to your Arduino');
    console.log('2. Configure your Google API key in .env');
    console.log('3. Run: ./start.sh');
} else {
    console.log('❌ Some tests failed. Please fix the issues above.');
}
console.log('='.repeat(50));
