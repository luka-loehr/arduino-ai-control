require('dotenv').config();
const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const port = 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Initialize serial port
let arduinoPort;
let parser;
let ledState = false;

// Initialize Arduino connection
async function initializeArduino() {
  try {
    const ports = await SerialPort.list();
    const arduinoInfo = ports.find(port =>
      port.path === '/dev/ttyACM0' ||
      port.path.includes('ttyUSB') ||
      port.path.includes('ttyACM')
    );

    if (arduinoInfo) {
      console.log(`Found Arduino on ${arduinoInfo.path}`);
      arduinoPort = new SerialPort({
        path: arduinoInfo.path,
        baudRate: 9600
      });

      parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

      arduinoPort.on('open', () => {
        console.log(`Serial port opened: ${arduinoInfo.path}`);
      });

      parser.on('data', data => {
        console.log('Arduino:', data.toString().trim());
      });

      arduinoPort.on('error', err => {
        console.error('Serial port error:', err);
      });
    } else {
      console.error('Arduino not found. Please check connection.');
      console.log('Available ports:', ports.map(p => p.path));
    }
  } catch (error) {
    console.error('Failed to initialize Arduino:', error);
  }
}

// Initialize Arduino on startup
initializeArduino();

// Send command to Arduino
const sendCommand = (command) => {
  return new Promise((resolve, reject) => {
    if (arduinoPort && arduinoPort.isOpen) {
      arduinoPort.write(command + '\n', (err) => {
        if (err) {
          reject(`Failed to send command: ${command}`);
        } else {
          resolve(`Command sent: ${command}`);
        }
      });
    } else {
      reject('Arduino not connected');
    }
  });
};

// LED control functions
const ledOn = () => {
  ledState = true;
  return sendCommand('ON');
};

const ledOff = () => {
  ledState = false;
  return sendCommand('OFF');
};

const ledBlink = (rate) => {
  const safeRate = Math.max(50, Math.min(5000, parseInt(rate) || 500));
  return sendCommand(`BLINK:${safeRate}`);
};

const ledFade = (speed) => {
  const safeSpeed = Math.max(1, Math.min(10, parseInt(speed) || 5));
  return sendCommand(`FADE:${safeSpeed}`);
};

const ledMorse = (text) => {
  const safeText = text.substring(0, 50);
  return sendCommand(`MORSE:${safeText}`);
};

const ledPattern = (pattern) => {
  const safePattern = pattern.replace(/[^01]/g, '').substring(0, 100);
  return sendCommand(`PATTERN:${safePattern}`);
};

// Pin control functions
const setPinMode = (pin, mode) => {
  const validModes = ['INPUT', 'OUTPUT', 'INPUT_PULLUP'];
  if (pin >= 0 && pin <= 19 && validModes.includes(mode)) {
    return sendCommand(`PIN:${pin},${mode}`);
  }
  throw new Error('Invalid pin or mode');
};

const digitalWrite = (pin, value) => {
  if (pin >= 0 && pin <= 19 && (value === 0 || value === 1)) {
    return sendCommand(`DIGITAL:${pin},${value}`);
  }
  throw new Error('Invalid pin or value');
};

const analogWrite = (pin, value) => {
  const pwmPins = [3, 5, 6, 9, 10, 11];
  if (pwmPins.includes(pin) && value >= 0 && value <= 255) {
    return sendCommand(`ANALOG:${pin},${value}`);
  }
  throw new Error('Invalid PWM pin or value');
};

const pwmWrite = (pin, value, duration) => {
  const pwmPins = [3, 5, 6, 9, 10, 11];
  if (pwmPins.includes(pin) && value >= 0 && value <= 255) {
    const cmd = duration && duration > 0 ?
      `PWM:${pin},${value},${duration}` :
      `PWM:${pin},${value}`;
    return sendCommand(cmd);
  }
  throw new Error('Invalid PWM pin or value');
};

const servoWrite = (pin, angle) => {
  if (pin >= 2 && pin <= 13 && angle >= 0 && angle <= 180) {
    return sendCommand(`SERVO:${pin},${angle}`);
  }
  throw new Error('Invalid servo pin or angle');
};

// Custom code execution functions
const executeCode = (code) => {
  return sendCommand(`EXEC:${code}`);
};

const executeMultiline = (code) => {
  // Count lines and replace newlines with |
  const lines = code.split('\n');
  const lineCount = lines.length;
  const formattedCode = lines.join('|');
  return sendCommand(`MULTI:${lineCount}:${formattedCode}`);
};

const setLoopCode = (code) => {
  return sendCommand(`LOOP:${code}`);
};

const resetArduino = () => {
  return sendCommand('RESET');
};

// Define the functions for Gemini
const functions = {
  ledOn: {
    description: 'Turn the LED on',
    execute: ledOn
  },
  ledOff: {
    description: 'Turn the LED off',
    execute: ledOff
  },
  ledBlink: {
    description: 'Make the LED blink at a specified rate',
    execute: (args) => ledBlink(args.rate)
  },
  ledFade: {
    description: 'Make the LED fade in and out',
    execute: (args) => ledFade(args.speed)
  },
  ledMorse: {
    description: 'Display text in morse code using the LED',
    execute: (args) => ledMorse(args.text)
  },
  ledPattern: {
    description: 'Display a custom on/off pattern',
    execute: (args) => ledPattern(args.pattern)
  },
  setPinMode: {
    description: 'Set the mode of a pin',
    execute: (args) => setPinMode(args.pin, args.mode)
  },
  digitalWrite: {
    description: 'Write a digital value to a pin',
    execute: (args) => digitalWrite(args.pin, args.value)
  },
  analogWrite: {
    description: 'Write an analog value to a PWM pin',
    execute: (args) => analogWrite(args.pin, args.value)
  },
  pwmWrite: {
    description: 'Write PWM with optional duration',
    execute: (args) => pwmWrite(args.pin, args.value, args.duration)
  },
  servoWrite: {
    description: 'Control a servo motor',
    execute: (args) => servoWrite(args.pin, args.angle)
  },
  executeCode: {
    description: 'Execute custom Arduino code',
    execute: (args) => executeCode(args.code)
  },
  executeMultiline: {
    description: 'Execute multiple lines of Arduino code',
    execute: (args) => executeMultiline(args.code)
  },
  setLoopCode: {
    description: 'Set code to run continuously in the Arduino loop',
    execute: (args) => setLoopCode(args.code)
  },
  resetArduino: {
    description: 'Reset Arduino and clear all custom code',
    execute: resetArduino
  }
};

// Function declarations for Gemini
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
          description: 'Blink rate in milliseconds (50-5000). Lower values = faster blinking'
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
          description: 'Fade speed from 1 (slow) to 10 (fast)'
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
          description: 'Text to display in morse code (max 50 characters)'
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
          description: 'Pattern string using 1 for on and 0 for off (e.g., "101010" for alternating, "110011" for double blinks). Each digit represents 100ms'
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
          description: 'Pin number (0-19)'
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
          description: 'Pin number (0-19)'
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
    name: 'analogWrite',
    description: 'Write an analog value to a PWM pin',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'PWM pin number (3, 5, 6, 9, 10, or 11)'
        },
        value: {
          type: 'number',
          description: 'Analog value (0-255)'
        }
      },
      required: ['pin', 'value']
    }
  },
  {
    name: 'pwmWrite',
    description: 'Write PWM with optional duration',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'number',
          description: 'PWM pin number (3, 5, 6, 9, 10, or 11)'
        },
        value: {
          type: 'number',
          description: 'PWM value (0-255)'
        },
        duration: {
          type: 'number',
          description: 'Optional duration in milliseconds'
        }
      },
      required: ['pin', 'value']
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
          description: 'Pin number (2-13)'
        },
        angle: {
          type: 'number',
          description: 'Servo angle (0-180 degrees)'
        }
      },
      required: ['pin', 'angle']
    }
  },
  {
    name: 'executeCode',
    description: 'Execute custom Arduino code. Supports: pinMode(), digitalWrite(), analogWrite(), delay(), digitalRead(), analogRead(), setRGB(r,g,b), rainbow(), fade(pin,speed), blink(pin,rate), if conditions, timers, counters, flags',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Single line of Arduino code to execute (e.g., "digitalWrite(13,HIGH)", "analogWrite(9,128)", "if(digitalRead(2)==HIGH)then:digitalWrite(13,HIGH)")'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'executeMultiline',
    description: 'Execute multiple lines of Arduino code at once',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Multiple lines of Arduino code separated by newlines'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'setLoopCode',
    description: 'Set code to run continuously in the Arduino loop. Perfect for animations, continuous effects, or monitoring sensors',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Arduino code to run repeatedly (e.g., "rainbow()" for continuous rainbow effect, "if(digitalRead(2)==HIGH)then:digitalWrite(13,HIGH)")'
        }
      },
      required: ['code']
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
  }
];

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Store chat sessions
const chatSessions = new Map();

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  // Validate input
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key not configured' });
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
      ledState: ledState
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message: ' + error.message });
  }
});

// Get LED state
app.get('/led/state', (_, res) => {
  res.json({ state: ledState });
});

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    arduino: arduinoPort && arduinoPort.isOpen ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Arduino AI Control Server running at http://localhost:${port}`);
  console.log(`📱 Open your browser and navigate to the URL above`);
  console.log(`🔌 Arduino status: ${arduinoPort && arduinoPort.isOpen ? 'Connected' : 'Disconnected'}`);
});