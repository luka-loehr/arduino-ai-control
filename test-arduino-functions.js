#!/usr/bin/env node

// Arduino AI Control System - Function Test Script

const WebSocket = require('ws');

console.log('🧪 Arduino AI Control System - Function Test');
console.log('============================================\n');

// Test configuration
const SERVER_URL = 'ws://localhost:3000';
const TEST_DELAY = 2000; // 2 seconds between tests

let ws;
let testResults = [];
let currentTest = 0;

// Test cases
const testCases = [
    {
        name: 'PING Test',
        command: 'PING',
        params: {},
        expectedResponse: 'success'
    },
    {
        name: 'LED On',
        command: 'LED_ON',
        params: {},
        expectedResponse: 'success'
    },
    {
        name: 'LED Off',
        command: 'LED_OFF',
        params: {},
        expectedResponse: 'success'
    },
    {
        name: 'LED Blink',
        command: 'LED_BLINK',
        params: { rate: 500 },
        expectedResponse: 'success'
    },
    {
        name: 'LED Fade',
        command: 'LED_FADE',
        params: { speed: 5 },
        expectedResponse: 'success'
    },
    {
        name: 'LED Morse Code',
        command: 'LED_MORSE',
        params: { text: 'HELLO' },
        expectedResponse: 'success'
    },
    {
        name: 'LED Pattern',
        command: 'LED_PATTERN',
        params: { pattern: '101010' },
        expectedResponse: 'success'
    },
    {
        name: 'Pin Mode Setup',
        command: 'PIN_MODE',
        params: { pin: 13, mode: 'OUTPUT' },
        expectedResponse: 'success'
    },
    {
        name: 'Digital Write',
        command: 'DIGITAL_WRITE',
        params: { pin: 13, value: 1 },
        expectedResponse: 'success'
    },
    {
        name: 'Digital Read',
        command: 'DIGITAL_READ',
        params: { pin: 2 },
        expectedResponse: 'success'
    },
    {
        name: 'Analog Write (PWM)',
        command: 'ANALOG_WRITE',
        params: { pin: 9, value: 128 },
        expectedResponse: 'success'
    },
    {
        name: 'Analog Read',
        command: 'ANALOG_READ',
        params: { pin: 0 },
        expectedResponse: 'success'
    },
    {
        name: 'Servo Control',
        command: 'SERVO_WRITE',
        params: { pin: 6, angle: 90 },
        expectedResponse: 'success'
    },
    {
        name: 'Stop Effects',
        command: 'STOP_EFFECTS',
        params: {},
        expectedResponse: 'success'
    },
    {
        name: 'System Reset',
        command: 'RESET',
        params: {},
        expectedResponse: 'success'
    },
    {
        name: 'Status Check',
        command: 'STATUS',
        params: {},
        expectedResponse: 'success'
    }
];

function connectWebSocket() {
    console.log('🔗 Connecting to Arduino AI Control Server...');
    
    ws = new WebSocket(SERVER_URL);
    
    ws.on('open', () => {
        console.log('✅ Connected to server');
        console.log('🚀 Starting function tests...\n');
        runNextTest();
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleServerMessage(message);
        } catch (error) {
            console.error('❌ Failed to parse server message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 Connection closed');
        printTestResults();
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        process.exit(1);
    });
}

function handleServerMessage(message) {
    if (message.type === 'system_state') {
        console.log('📊 System state received');
        if (!message.data.arduino.connected) {
            console.log('⚠️  Arduino not connected. Please connect Arduino and run setup first.');
            process.exit(1);
        }
    } else if (message.id && message.id.startsWith('test_')) {
        // This is a response to our test command
        const testIndex = parseInt(message.id.split('_')[1]);
        const test = testCases[testIndex];
        
        if (test) {
            const success = message.success === true;
            testResults[testIndex] = {
                name: test.name,
                success: success,
                message: message.message || 'No message',
                response: message
            };
            
            console.log(`${success ? '✅' : '❌'} ${test.name}: ${message.message || 'No response'}`);
            
            // Wait before next test
            setTimeout(() => {
                runNextTest();
            }, TEST_DELAY);
        }
    }
}

function runNextTest() {
    if (currentTest >= testCases.length) {
        console.log('\n🏁 All tests completed!');
        ws.close();
        return;
    }
    
    const test = testCases[currentTest];
    const testId = `test_${currentTest}`;
    
    console.log(`🧪 Running: ${test.name}...`);
    
    const command = {
        type: 'arduino_command',
        command: test.command,
        params: test.params,
        id: testId
    };
    
    // Override the command structure for WebSocket
    const wsMessage = {
        type: 'arduino_command',
        command: test.command,
        params: test.params
    };
    
    ws.send(JSON.stringify(wsMessage));
    currentTest++;
}

function printTestResults() {
    console.log('\n📋 Test Results Summary');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    
    testResults.forEach((result, index) => {
        if (result) {
            if (result.success) {
                passed++;
                console.log(`✅ ${result.name}`);
            } else {
                failed++;
                console.log(`❌ ${result.name}: ${result.message}`);
            }
        } else {
            failed++;
            console.log(`❌ Test ${index + 1}: No response received`);
        }
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total:  ${testResults.length}`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! Arduino AI Control System is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check your Arduino connection and firmware.');
    }
}

// Check if server is running
console.log('🔍 Checking if server is running...');
const http = require('http');

const healthCheck = http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const health = JSON.parse(data);
            console.log('🏥 Server health:', health);
            
            if (health.arduino === 'connected') {
                console.log('✅ Arduino is connected, starting tests...\n');
                connectWebSocket();
            } else {
                console.log('⚠️  Arduino not connected. Please run setup wizard first.');
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Failed to parse health response:', error);
            process.exit(1);
        }
    });
}).on('error', (error) => {
    console.error('❌ Server not running. Please start the server first:');
    console.error('   npm start');
    process.exit(1);
});
