require('dotenv').config();
const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const { exec } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 3000;

// Initialize Gemini (will be updated when API key is provided)
let genAI = null;
let currentApiKey = process.env.GOOGLE_API_KEY || null;

// Initialize Gemini if API key is available
if (currentApiKey) {
  genAI = new GoogleGenerativeAI(currentApiKey);
}

// System state
let arduinoPort;
let parser;
let connectedClients = new Set();

let systemState = {
  arduino: {
    connected: false,
    port: null,
    board: null,
    firmwareUploaded: false,
    lastSeen: null
  },
  hardware: {
    led: false,
    pins: {},
    sensors: {},
    effects: {
      blinking: false,
      fading: false,
      pattern: false,
      morse: false,
      rainbow: false
    }
  },
  communication: {
    lastCommand: null,
    lastResponse: null,
    commandQueue: [],
    responseQueue: new Map()
  },
  setup: {
    step: 'detection', // detection, firmware, testing, ready
    progress: 0,
    message: 'Detecting Arduino...'
  }
};

// WebSocket connection management
wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log('🔗 Client connected via WebSocket');

  // Send current system state
  ws.send(JSON.stringify({
    type: 'system_state',
    data: systemState
  }));

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('🔌 Client disconnected');
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleWebSocketMessage(data, ws);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Arduino communication protocol
const COMMANDS = {
  LED_ON: 'LED_ON',
  LED_OFF: 'LED_OFF',
  LED_BLINK: 'LED_BLINK',
  LED_FADE: 'LED_FADE',
  LED_MORSE: 'LED_MORSE',
  LED_PATTERN: 'LED_PATTERN',
  PIN_MODE: 'PIN_MODE',
  DIGITAL_WRITE: 'DIGITAL_WRITE',
  DIGITAL_READ: 'DIGITAL_READ',
  ANALOG_WRITE: 'ANALOG_WRITE',
  ANALOG_READ: 'ANALOG_READ',
  SERVO_WRITE: 'SERVO_WRITE',
  STOP_EFFECTS: 'STOP_EFFECTS',
  RESET: 'RESET',
  STATUS: 'STATUS',
  PING: 'PING'
};

// Arduino board detection
async function detectArduinoBoards() {
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

    return arduinoPorts.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || 'Unknown',
      vendorId: port.vendorId,
      productId: port.productId,
      boardType: detectBoardType(port)
    }));
  } catch (error) {
    console.error('Error detecting Arduino boards:', error);
    return [];
  }
}

// Detect Arduino board type
function detectBoardType(port) {
  const vid = port.vendorId;
  const pid = port.productId;

  if (vid === '2341') {
    if (pid === '0043' || pid === '0001') return 'Arduino Uno';
    if (pid === '0042' || pid === '0010') return 'Arduino Mega';
    if (pid === '8036' || pid === '8037') return 'Arduino Leonardo';
    if (pid === '804d' || pid === '804e') return 'Arduino Micro';
  }

  return 'Arduino Compatible';
}

// Firmware upload functionality
async function uploadFirmware(portPath, boardType = 'arduino:avr:uno') {
  return new Promise((resolve, reject) => {
    const uploadScript = path.join(__dirname, 'scripts', 'upload-firmware.sh');
    const uploadCommand = `"${uploadScript}" --port "${portPath}" --board "${boardType}"`;

    console.log(`📤 Uploading firmware to ${portPath}...`);

    const uploadProcess = exec(uploadCommand, (error, stdout) => {
      if (error) {
        console.error('❌ Upload failed:', error);
        broadcast({
          type: 'upload_error',
          data: { message: `Upload failed: ${error.message}` }
        });
        reject(new Error(`Upload failed: ${error.message}`));
        return;
      }

      console.log('✅ Firmware uploaded successfully');
      broadcast({
        type: 'upload_success',
        data: { message: 'Firmware uploaded successfully!' }
      });
      resolve({ success: true, output: stdout });
    });

    uploadProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log('Upload output:', message);
      broadcast({
        type: 'upload_progress',
        data: { message }
      });
    });

    uploadProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.log('Upload stderr:', message);
      // Some tools output progress to stderr, so treat as progress unless it's clearly an error
      if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        broadcast({
          type: 'upload_error',
          data: { message }
        });
      } else {
        broadcast({
          type: 'upload_progress',
          data: { message }
        });
      }
    });
  });
}

// Initialize Arduino connection
async function initializeArduino(portPath = null) {
  try {
    let arduinoInfo;

    if (portPath) {
      arduinoInfo = { path: portPath };
    } else {
      const boards = await detectArduinoBoards();
      if (boards.length === 0) {
        throw new Error('No Arduino boards detected');
      }
      arduinoInfo = boards[0];
    }

    console.log(`🔌 Connecting to Arduino on ${arduinoInfo.path}`);

    // Close existing connection if any
    if (arduinoPort && arduinoPort.isOpen) {
      arduinoPort.close();
    }

    arduinoPort = new SerialPort({
      path: arduinoInfo.path,
      baudRate: 9600,
      autoOpen: false
    });

    parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    arduinoPort.on('open', () => {
      console.log(`✅ Serial port opened: ${arduinoInfo.path}`);
      systemState.arduino.connected = true;
      systemState.arduino.port = arduinoInfo.path;
      systemState.arduino.lastSeen = new Date().toISOString();

      broadcast({
        type: 'arduino_connected',
        data: systemState.arduino
      });

      // Test communication
      setTimeout(() => testArduinoCommunication(), 1000);
    });

    parser.on('data', handleArduinoResponse);

    arduinoPort.on('error', err => {
      console.error('❌ Serial port error:', err);
      systemState.arduino.connected = false;
      broadcast({
        type: 'arduino_error',
        data: { error: err.message }
      });
    });

    arduinoPort.on('close', () => {
      console.log('🔌 Serial port closed');
      systemState.arduino.connected = false;
      broadcast({
        type: 'arduino_disconnected',
        data: systemState.arduino
      });
    });

    // Open the port
    arduinoPort.open();

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Arduino:', error);
    systemState.arduino.connected = false;
    throw error;
  }
}

// Test Arduino communication
async function testArduinoCommunication() {
  try {
    const response = await sendCommand(COMMANDS.PING, {}, true);
    if (response && response.success) {
      systemState.arduino.firmwareUploaded = true;
      systemState.setup.step = 'ready';
      systemState.setup.message = 'Arduino ready for AI control';

      broadcast({
        type: 'setup_complete',
        data: systemState
      });
    }
  } catch (error) {
    console.log('⚠️ Arduino communication test failed - firmware may need upload');
    systemState.arduino.firmwareUploaded = false;
    systemState.setup.step = 'firmware';
    systemState.setup.message = 'Firmware upload required';

    broadcast({
      type: 'firmware_required',
      data: systemState
    });
  }
}

// Handle WebSocket messages from clients
async function handleWebSocketMessage(data, ws) {
  try {
    switch (data.type) {
      case 'set_api_key':
        if (data.apiKey && typeof data.apiKey === 'string' && data.apiKey.trim().length > 0) {
          currentApiKey = data.apiKey.trim();
          genAI = new GoogleGenerativeAI(currentApiKey);
          console.log('🔑 API key updated from client');
          ws.send(JSON.stringify({
            type: 'api_key_status',
            data: { configured: true, message: 'API key configured successfully' }
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'api_key_status',
            data: { configured: false, message: 'Invalid API key' }
          }));
        }
        break;

      case 'detect_arduino':
        const boards = await detectArduinoBoards();
        ws.send(JSON.stringify({
          type: 'arduino_boards',
          data: boards
        }));
        break;

      case 'connect_arduino':
        await initializeArduino(data.port);
        break;

      case 'upload_firmware':
        try {
          await uploadFirmware(data.port, data.boardType);
          // After upload, reconnect
          setTimeout(() => initializeArduino(data.port), 2000);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'upload_error',
            data: { error: error.message }
          }));
        }
        break;

      case 'arduino_command':
        if (systemState.arduino.connected) {
          try {
            const result = await sendCommand(data.command, data.params);
            ws.send(JSON.stringify({
              type: 'command_result',
              data: result
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'command_error',
              data: { error: error.message }
            }));
          }
        } else {
          ws.send(JSON.stringify({
            type: 'command_error',
            data: { error: 'Arduino not connected' }
          }));
        }
        break;

      case 'get_system_state':
        ws.send(JSON.stringify({
          type: 'system_state',
          data: systemState
        }));
        break;
    }
  } catch (error) {
    console.error('WebSocket handler error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      data: { error: error.message }
    }));
  }
}

// Handle responses from Arduino
function handleArduinoResponse(data) {
  const response = data.toString().trim();
  console.log('📡 Arduino:', response);

  try {
    // Try to parse as JSON for structured responses
    const parsed = JSON.parse(response);

    // Update system state
    systemState.communication.lastResponse = parsed;
    systemState.arduino.lastSeen = new Date().toISOString();

    if (parsed.id && systemState.communication.responseQueue.has(parsed.id)) {
      const { resolve } = systemState.communication.responseQueue.get(parsed.id);
      systemState.communication.responseQueue.delete(parsed.id);
      resolve(parsed);
    }

    if (parsed.type === 'status') {
      updateSystemState(parsed.data);
    }

    // Broadcast to all clients
    broadcast({
      type: 'arduino_response',
      data: parsed
    });

  } catch (e) {
    // Handle plain text responses
    systemState.communication.lastResponse = { text: response, timestamp: Date.now() };

    broadcast({
      type: 'arduino_message',
      data: { message: response, timestamp: Date.now() }
    });
  }
}

// Update system state from Arduino status
function updateSystemState(data) {
  if (data) {
    if (data.led !== undefined) systemState.hardware.led = data.led;
    if (data.pins) systemState.hardware.pins = { ...systemState.hardware.pins, ...data.pins };
    if (data.sensors) systemState.hardware.sensors = { ...systemState.hardware.sensors, ...data.sensors };
    if (data.effects) systemState.hardware.effects = { ...systemState.hardware.effects, ...data.effects };

    broadcast({
      type: 'system_state_update',
      data: systemState
    });
  }
}

// Send command to Arduino with improved error handling
function sendCommand(command, params = {}, expectResponse = true) {
  return new Promise((resolve, reject) => {
    if (!arduinoPort || !arduinoPort.isOpen) {
      reject(new Error('Arduino not connected'));
      return;
    }

    const commandId = Date.now().toString() + Math.random().toString(36).substring(2, 11);
    const message = JSON.stringify({
      id: commandId,
      command: command,
      params: params,
      timestamp: Date.now()
    });

    systemState.communication.lastCommand = { command, params, timestamp: Date.now() };

    if (expectResponse) {
      // Set up response handler
      systemState.communication.responseQueue.set(commandId, { resolve, reject });

      // Set timeout for response
      setTimeout(() => {
        if (systemState.communication.responseQueue.has(commandId)) {
          systemState.communication.responseQueue.delete(commandId);
          reject(new Error(`Command timeout: ${command}`));
        }
      }, 5000);
    }

    arduinoPort.write(message + '\n', (err) => {
      if (err) {
        if (expectResponse && systemState.communication.responseQueue.has(commandId)) {
          systemState.communication.responseQueue.delete(commandId);
        }
        reject(new Error(`Failed to send command: ${err.message}`));
      } else if (!expectResponse) {
        resolve({ success: true, command, params });
      }
    });
  });
}

// Arduino control functions with improved implementation
const ArduinoController = {
  // LED Controls
  async ledOn() {
    const result = await sendCommand(COMMANDS.LED_ON);
    systemState.hardware.led = true;
    return result;
  },

  async ledOff() {
    const result = await sendCommand(COMMANDS.LED_OFF);
    systemState.hardware.led = false;
    systemState.hardware.effects.blinking = false;
    systemState.hardware.effects.fading = false;
    return result;
  },

  async ledBlink(rate = 500) {
    const safeRate = Math.max(50, Math.min(5000, parseInt(rate)));
    const result = await sendCommand(COMMANDS.LED_BLINK, { rate: safeRate });
    systemState.hardware.effects.blinking = true;
    return result;
  },

  async ledFade(speed = 5) {
    const safeSpeed = Math.max(1, Math.min(10, parseInt(speed)));
    const result = await sendCommand(COMMANDS.LED_FADE, { speed: safeSpeed });
    systemState.hardware.effects.fading = true;
    return result;
  },

  async ledMorse(text) {
    const safeText = text.substring(0, 50).toUpperCase();
    const result = await sendCommand(COMMANDS.LED_MORSE, { text: safeText });
    systemState.hardware.effects.morse = true;
    return result;
  },

  async ledPattern(pattern) {
    const safePattern = pattern.replace(/[^01]/g, '').substring(0, 100);
    const result = await sendCommand(COMMANDS.LED_PATTERN, { pattern: safePattern });
    systemState.hardware.effects.pattern = true;
    return result;
  },

  // Pin Controls
  async setPinMode(pin, mode) {
    const validModes = ['INPUT', 'OUTPUT', 'INPUT_PULLUP'];
    if (pin >= 0 && pin <= 19 && validModes.includes(mode)) {
      const result = await sendCommand(COMMANDS.PIN_MODE, { pin, mode });
      systemState.hardware.pins[pin] = { mode };
      return result;
    }
    throw new Error('Invalid pin or mode');
  },

  async digitalWrite(pin, value) {
    if (pin >= 0 && pin <= 19 && (value === 0 || value === 1)) {
      const result = await sendCommand(COMMANDS.DIGITAL_WRITE, { pin, value });
      if (!systemState.hardware.pins[pin]) systemState.hardware.pins[pin] = {};
      systemState.hardware.pins[pin].digitalValue = value;
      return result;
    }
    throw new Error('Invalid pin or value');
  },

  async digitalRead(pin) {
    if (pin >= 0 && pin <= 19) {
      return await sendCommand(COMMANDS.DIGITAL_READ, { pin });
    }
    throw new Error('Invalid pin');
  },

  async analogWrite(pin, value) {
    const pwmPins = [3, 5, 6, 9, 10, 11];
    if (pwmPins.includes(pin) && value >= 0 && value <= 255) {
      const result = await sendCommand(COMMANDS.ANALOG_WRITE, { pin, value });
      if (!systemState.hardware.pins[pin]) systemState.hardware.pins[pin] = {};
      systemState.hardware.pins[pin].analogValue = value;
      return result;
    }
    throw new Error('Invalid PWM pin or value');
  },

  async analogRead(pin) {
    if (pin >= 0 && pin <= 5) {
      return await sendCommand(COMMANDS.ANALOG_READ, { pin });
    }
    throw new Error('Invalid analog pin');
  },

  async servoWrite(pin, angle) {
    if (pin >= 2 && pin <= 13 && angle >= 0 && angle <= 180) {
      const result = await sendCommand(COMMANDS.SERVO_WRITE, { pin, angle });
      if (!systemState.hardware.pins[pin]) systemState.hardware.pins[pin] = {};
      systemState.hardware.pins[pin].servoAngle = angle;
      return result;
    }
    throw new Error('Invalid servo pin or angle');
  },

  // System Controls
  async stopEffects() {
    const result = await sendCommand(COMMANDS.STOP_EFFECTS);
    systemState.hardware.effects = {
      blinking: false,
      fading: false,
      pattern: false,
      morse: false,
      rainbow: false
    };
    return result;
  },

  async reset() {
    const result = await sendCommand(COMMANDS.RESET);
    systemState.hardware = {
      led: false,
      pins: {},
      sensors: {},
      effects: {
        blinking: false,
        fading: false,
        pattern: false,
        morse: false,
        rainbow: false
      }
    };
    return result;
  },

  async getStatus() {
    return await sendCommand(COMMANDS.STATUS);
  }
};

// Initialize Arduino detection on startup
setTimeout(async () => {
  console.log('🔍 Starting Arduino detection...');
  const boards = await detectArduinoBoards();
  if (boards.length > 0) {
    console.log(`🎯 Found ${boards.length} Arduino board(s)`);
    try {
      await initializeArduino(boards[0].path);
    } catch (error) {
      console.log('⚠️ Initial connection failed, waiting for manual setup');
    }
  } else {
    console.log('⚠️ No Arduino boards detected');
  }
}, 1000);



// Function declarations for Gemini AI
const functionDeclarations = [
  {
    name: 'ledOn',
    description: 'Turn the Arduino LED on',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'ledOff',
    description: 'Turn the Arduino LED off',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'ledBlink',
    description: 'Make the LED blink at a specified rate',
    parameters: {
      type: 'object',
      properties: {
        rate: {
          type: 'number',
          description: 'Blink rate in milliseconds (50-5000). Lower values = faster blinking',
          minimum: 50,
          maximum: 5000
        }
      },
      required: ['rate']
    }
  },
  {
    name: 'ledFade',
    description: 'Make the LED fade in and out smoothly',
    parameters: {
      type: 'object',
      properties: {
        speed: {
          type: 'number',
          description: 'Fade speed from 1 (slow) to 10 (fast)',
          minimum: 1,
          maximum: 10
        }
      },
      required: ['speed']
    }
  },
  {
    name: 'ledMorse',
    description: 'Display text as morse code using the LED',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to display in morse code (max 50 characters)',
          maxLength: 50
        }
      },
      required: ['text']
    }
  },
  {
    name: 'ledPattern',
    description: 'Display a custom on/off pattern using the LED',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Pattern string using 1 for on and 0 for off (e.g., "101010" for alternating). Each digit represents 100ms',
          pattern: '^[01]+$',
          maxLength: 100
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'setPinMode',
    description: 'Set the mode of an Arduino pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'Pin number (0-19)',
          minimum: 0,
          maximum: 19
        },
        mode: {
          type: 'string',
          enum: ['INPUT', 'OUTPUT', 'INPUT_PULLUP'],
          description: 'Pin mode'
        }
      },
      required: ['pin', 'mode']
    }
  },
  {
    name: 'digitalWrite',
    description: 'Write a digital value (HIGH/LOW) to a pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'Pin number (0-19)',
          minimum: 0,
          maximum: 19
        },
        value: {
          type: 'integer',
          description: '0 for LOW, 1 for HIGH',
          minimum: 0,
          maximum: 1
        }
      },
      required: ['pin', 'value']
    }
  },
  {
    name: 'digitalRead',
    description: 'Read a digital value from a pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'Pin number (0-19)',
          minimum: 0,
          maximum: 19
        }
      },
      required: ['pin']
    }
  },
  {
    name: 'analogWrite',
    description: 'Write an analog value to a PWM pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'PWM pin number (3, 5, 6, 9, 10, or 11)',
          enum: [3, 5, 6, 9, 10, 11]
        },
        value: {
          type: 'number',
          description: 'Analog value (0-255)',
          minimum: 0,
          maximum: 255
        }
      },
      required: ['pin', 'value']
    }
  },
  {
    name: 'analogRead',
    description: 'Read an analog value from a pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'Analog pin number (0-5)',
          minimum: 0,
          maximum: 5
        }
      },
      required: ['pin']
    }
  },
  {
    name: 'servoWrite',
    description: 'Control a servo motor connected to a pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'Pin number (2-13)',
          minimum: 2,
          maximum: 13
        },
        angle: {
          type: 'number',
          description: 'Servo angle (0-180 degrees)',
          minimum: 0,
          maximum: 180
        }
      },
      required: ['pin', 'angle']
    }
  },
  {
    name: 'stopEffects',
    description: 'Stop all LED effects (blinking, fading, patterns, morse)',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'resetArduino',
    description: 'Reset Arduino to default state, clear all custom code and turn off all pins',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getStatus',
    description: 'Get current Arduino status including pin states and sensor readings',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Express middleware
app.use(express.static('public'));
app.use(express.json());

// Store chat sessions
const chatSessions = new Map();

// Map function names to ArduinoController methods for AI execution
const functions = {
  ledOn: { execute: ArduinoController.ledOn },
  ledOff: { execute: ArduinoController.ledOff },
  ledBlink: { execute: (args) => ArduinoController.ledBlink(args.rate) },
  ledFade: { execute: (args) => ArduinoController.ledFade(args.speed) },
  ledMorse: { execute: (args) => ArduinoController.ledMorse(args.text) },
  ledPattern: { execute: (args) => ArduinoController.ledPattern(args.pattern) },
  setPinMode: { execute: (args) => ArduinoController.setPinMode(args.pin, args.mode) },
  digitalWrite: { execute: (args) => ArduinoController.digitalWrite(args.pin, args.value) },
  digitalRead: { execute: (args) => ArduinoController.digitalRead(args.pin) },
  analogWrite: { execute: (args) => ArduinoController.analogWrite(args.pin, args.value) },
  analogRead: { execute: (args) => ArduinoController.analogRead(args.pin) },
  servoWrite: { execute: (args) => ArduinoController.servoWrite(args.pin, args.angle) },
  stopEffects: { execute: ArduinoController.stopEffects },
  resetArduino: { execute: ArduinoController.reset },
  getStatus: { execute: ArduinoController.getStatus }
};

// API Routes

// Arduino setup and management endpoints
app.get('/api/arduino/detect', async (_, res) => {
  try {
    const boards = await detectArduinoBoards();
    res.json({ success: true, boards });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/arduino/connect', async (req, res) => {
  try {
    const { port } = req.body;
    await initializeArduino(port);
    res.json({ success: true, message: 'Arduino connected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/arduino/upload', async (req, res) => {
  try {
    const { port, boardType = 'arduino:avr:uno' } = req.body;
    await uploadFirmware(port, boardType);
    res.json({ success: true, message: 'Firmware uploaded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/system/state', (_, res) => {
  res.json({ success: true, state: systemState });
});

// Chat endpoint for AI interaction
app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
  }

  if (!currentApiKey || !genAI) {
    return res.status(500).json({ error: 'Google API key not configured. Please set your API key in the web interface.' });
  }

  if (!systemState.arduino.connected) {
    return res.status(503).json({ error: 'Arduino not connected. Please connect Arduino first.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ functionDeclarations }]
    });

    // Get or create chat session
    let chat = chatSessions.get(sessionId);
    if (!chat) {
      chat = model.startChat();
      chatSessions.set(sessionId, chat);
    }

    let result = await chat.sendMessage(message);
    let response = result.response;
    let functionsCalled = [];

    // Handle function calls - keep processing until no more function calls
    while (response.functionCalls() && response.functionCalls().length > 0) {
      const functionCalls = response.functionCalls();
      const functionResponses = [];

      // Execute all function calls
      for (const functionCall of functionCalls) {
        const functionName = functionCall.name;
        const functionToCall = functions[functionName];

        if (functionToCall) {
          try {
            const args = functionCall.args || {};
            const functionResult = await functionToCall.execute(args);
            functionResponses.push({
              functionResponse: {
                name: functionName,
                response: { result: functionResult }
              }
            });
            functionsCalled.push({ name: functionName, args });
          } catch (error) {
            functionResponses.push({
              functionResponse: {
                name: functionName,
                response: { error: error.toString() }
              }
            });
          }
        }
      }

      // Send all function responses back to the model
      if (functionResponses.length > 0) {
        result = await chat.sendMessage(functionResponses);
        response = result.response;
      } else {
        break;
      }
    }

    res.json({
      response: response.text(),
      functionsCalled: functionsCalled,
      systemState: systemState
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message: ' + error.message });
  }
});

// Legacy endpoints for compatibility
app.get('/led/state', (_, res) => {
  res.json({ state: systemState.hardware.led });
});

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    arduino: systemState.arduino.connected ? 'connected' : 'disconnected',
    firmware: systemState.arduino.firmwareUploaded,
    apiKey: currentApiKey ? 'configured' : 'not_configured',
    setup: systemState.setup,
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Arduino AI Control Server running at http://localhost:${port}`);
  console.log(`📱 Open your browser and navigate to the URL above`);
  console.log(`🔌 WebSocket server ready for real-time communication`);
});