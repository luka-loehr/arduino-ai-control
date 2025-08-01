#!/usr/bin/env node

/**
 * Arduino AI Bridge - Local Hardware Interface
 * 
 * This bridge runs on your local computer and provides secure communication
 * between your Arduino hardware and the cloud-based AI interface.
 * 
 * TRANSPARENCY NOTICE:
 * - This code is 100% open source: https://github.com/luka-loehr/arduino-ai-control
 * - All network communication is logged and visible
 * - No data is collected or stored remotely
 * - Your Arduino remains under your complete control
 * 
 * WHY IS THIS NEEDED?
 * Web browsers cannot access USB/Serial devices directly for security reasons.
 * This bridge provides the necessary hardware interface while maintaining security.
 */

const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { machineId } = require('node-machine-id');
const path = require('path');

// Configuration
const BRIDGE_PORT = 8080;
const CLOUD_URL = process.env.CLOUD_URL || 'wss://arduino-control.onrender.com';
const BRIDGE_VERSION = '1.0.0';

// Application state
let bridgeId = null;
let arduinoPort = null;
let parser = null;
let cloudConnection = null;
let systemState = {
    bridge: {
        id: null,
        version: BRIDGE_VERSION,
        status: 'starting',
        startTime: new Date().toISOString()
    },
    arduino: {
        connected: false,
        port: null,
        board: null,
        firmwareVersion: null
    },
    cloud: {
        connected: false,
        url: CLOUD_URL,
        lastPing: null
    },
    stats: {
        commandsProcessed: 0,
        uptime: 0,
        lastActivity: null
    }
};

// Express app for local status interface
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('🤖 Arduino AI Bridge Starting...');
console.log('=====================================');
console.log(`📋 Version: ${BRIDGE_VERSION}`);
console.log(`🔗 Cloud URL: ${CLOUD_URL}`);
console.log(`🌐 Local Status: http://localhost:${BRIDGE_PORT}`);
console.log(`📖 Source Code: https://github.com/luka-loehr/arduino-ai-control`);
console.log('=====================================\n');

// Initialize bridge
async function initializeBridge() {
    try {
        // Generate unique bridge ID
        bridgeId = await machineId();
        systemState.bridge.id = bridgeId;
        systemState.bridge.status = 'initializing';
        
        console.log(`🆔 Bridge ID: ${bridgeId}`);
        
        // Start local status server
        startLocalServer();
        
        // Detect and connect to Arduino
        await detectArduino();
        
        // Connect to cloud service
        connectToCloud();
        
        systemState.bridge.status = 'running';
        console.log('✅ Bridge initialization complete');
        
    } catch (error) {
        console.error('❌ Bridge initialization failed:', error);
        systemState.bridge.status = 'error';
        process.exit(1);
    }
}

// Start local status server
function startLocalServer() {
    // Status endpoint
    app.get('/status', (req, res) => {
        res.json({
            ...systemState,
            transparency: {
                sourceCode: 'https://github.com/luka-loehr/arduino-ai-control',
                documentation: 'https://github.com/luka-loehr/arduino-ai-control/tree/main/arduino-bridge',
                security: 'All communication is logged and auditable',
                privacy: 'No data is collected or stored remotely'
            }
        });
    });
    
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: systemState.bridge.status,
            arduino: systemState.arduino.connected,
            cloud: systemState.cloud.connected,
            uptime: Math.floor((Date.now() - new Date(systemState.bridge.startTime)) / 1000)
        });
    });
    
    // Arduino command endpoint (for local testing)
    app.post('/arduino/command', async (req, res) => {
        try {
            const { command, params } = req.body;
            const result = await sendArduinoCommand(command, params);
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    
    app.listen(BRIDGE_PORT, () => {
        console.log(`🌐 Local status server running on http://localhost:${BRIDGE_PORT}`);
    });
}

// Detect and connect to Arduino
async function detectArduino() {
    console.log('🔍 Detecting Arduino boards...');
    
    try {
        const ports = await SerialPort.list();
        const arduinoPorts = ports.filter(port => {
            const manufacturer = (port.manufacturer || '').toLowerCase();
            const vendorId = port.vendorId;
            
            return manufacturer.includes('arduino') ||
                   manufacturer.includes('ch340') ||
                   manufacturer.includes('ftdi') ||
                   vendorId === '2341' || // Arduino
                   vendorId === '1a86' || // CH340
                   vendorId === '0403' || // FTDI
                   port.path.includes('ttyACM') ||
                   port.path.includes('ttyUSB') ||
                   port.path.includes('COM');
        });
        
        if (arduinoPorts.length === 0) {
            console.log('⚠️  No Arduino boards detected');
            console.log('   Please connect your Arduino via USB and restart the bridge');
            return;
        }
        
        // Connect to first available Arduino
        const selectedPort = arduinoPorts[0];
        await connectToArduino(selectedPort.path);
        
    } catch (error) {
        console.error('❌ Arduino detection failed:', error);
    }
}

// Connect to Arduino
async function connectToArduino(portPath) {
    try {
        console.log(`🔌 Connecting to Arduino on ${portPath}...`);
        
        arduinoPort = new SerialPort({
            path: portPath,
            baudRate: 9600,
            autoOpen: false
        });
        
        parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        arduinoPort.on('open', () => {
            console.log(`✅ Arduino connected on ${portPath}`);
            systemState.arduino.connected = true;
            systemState.arduino.port = portPath;
            
            // Test communication
            setTimeout(() => testArduinoCommunication(), 1000);
        });
        
        parser.on('data', handleArduinoResponse);
        
        arduinoPort.on('error', (err) => {
            console.error('❌ Arduino error:', err);
            systemState.arduino.connected = false;
        });
        
        arduinoPort.on('close', () => {
            console.log('🔌 Arduino disconnected');
            systemState.arduino.connected = false;
        });
        
        arduinoPort.open();
        
    } catch (error) {
        console.error('❌ Failed to connect to Arduino:', error);
        throw error;
    }
}

// Handle Arduino responses
function handleArduinoResponse(data) {
    const response = data.toString().trim();
    console.log('📡 Arduino:', response);
    
    systemState.stats.lastActivity = new Date().toISOString();
    
    // Forward to cloud if connected
    if (cloudConnection && cloudConnection.readyState === WebSocket.OPEN) {
        cloudConnection.send(JSON.stringify({
            type: 'arduino_response',
            bridgeId: bridgeId,
            data: response,
            timestamp: Date.now()
        }));
    }
}

// Test Arduino communication
async function testArduinoCommunication() {
    try {
        const result = await sendArduinoCommand('PING', {});
        console.log('✅ Arduino communication test successful');
        systemState.arduino.firmwareVersion = 'detected';
    } catch (error) {
        console.log('⚠️  Arduino communication test failed - firmware may need upload');
    }
}

// Send command to Arduino
function sendArduinoCommand(command, params) {
    return new Promise((resolve, reject) => {
        if (!arduinoPort || !arduinoPort.isOpen) {
            reject(new Error('Arduino not connected'));
            return;
        }
        
        const commandId = uuidv4();
        const message = JSON.stringify({
            id: commandId,
            command: command,
            params: params,
            timestamp: Date.now()
        });
        
        console.log(`📤 Sending to Arduino: ${command}`);
        
        arduinoPort.write(message + '\n', (err) => {
            if (err) {
                reject(new Error(`Failed to send command: ${err.message}`));
            } else {
                systemState.stats.commandsProcessed++;
                resolve({ success: true, commandId });
            }
        });
    });
}

// Connect to cloud service
function connectToCloud() {
    console.log(`🌐 Connecting to cloud service: ${CLOUD_URL}`);
    
    cloudConnection = new WebSocket(CLOUD_URL);
    
    cloudConnection.on('open', () => {
        console.log('✅ Connected to cloud service');
        systemState.cloud.connected = true;
        
        // Register bridge
        cloudConnection.send(JSON.stringify({
            type: 'bridge_register',
            bridgeId: bridgeId,
            version: BRIDGE_VERSION,
            arduino: systemState.arduino,
            timestamp: Date.now()
        }));
    });
    
    cloudConnection.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleCloudMessage(message);
        } catch (error) {
            console.error('❌ Failed to parse cloud message:', error);
        }
    });
    
    cloudConnection.on('close', () => {
        console.log('🔌 Cloud connection closed, attempting reconnect...');
        systemState.cloud.connected = false;
        setTimeout(connectToCloud, 5000);
    });
    
    cloudConnection.on('error', (error) => {
        console.error('❌ Cloud connection error:', error);
        systemState.cloud.connected = false;
    });
}

// Handle cloud messages
async function handleCloudMessage(message) {
    console.log('📥 Cloud message:', message.type);
    
    systemState.cloud.lastPing = new Date().toISOString();
    
    switch (message.type) {
        case 'arduino_command':
            try {
                const result = await sendArduinoCommand(message.command, message.params);
                cloudConnection.send(JSON.stringify({
                    type: 'command_result',
                    bridgeId: bridgeId,
                    commandId: message.id,
                    result: result,
                    timestamp: Date.now()
                }));
            } catch (error) {
                cloudConnection.send(JSON.stringify({
                    type: 'command_error',
                    bridgeId: bridgeId,
                    commandId: message.id,
                    error: error.message,
                    timestamp: Date.now()
                }));
            }
            break;
            
        case 'ping':
            cloudConnection.send(JSON.stringify({
                type: 'pong',
                bridgeId: bridgeId,
                timestamp: Date.now()
            }));
            break;
            
        case 'status_request':
            cloudConnection.send(JSON.stringify({
                type: 'bridge_status',
                bridgeId: bridgeId,
                status: systemState,
                timestamp: Date.now()
            }));
            break;
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bridge...');
    
    if (arduinoPort && arduinoPort.isOpen) {
        arduinoPort.close();
    }
    
    if (cloudConnection) {
        cloudConnection.close();
    }
    
    console.log('✅ Bridge shutdown complete');
    process.exit(0);
});

// Start the bridge
initializeBridge().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
