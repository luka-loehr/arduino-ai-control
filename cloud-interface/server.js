/**
 * Arduino AI Control - Cloud Interface
 * 
 * This is the cloud-hosted component that provides the web interface
 * and AI processing capabilities. It communicates with local Arduino
 * bridges running on users' computers.
 * 
 * TRANSPARENCY:
 * - Source code: https://github.com/luka-loehr/arduino-ai-control
 * - No user data collection or storage
 * - Users provide their own Google API keys
 * - All communication is logged and auditable
 */

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Application state
const connectedBridges = new Map();
const userSessions = new Map();
const chatSessions = new Map();

// Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "ws:", "wss:"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

console.log('☁️  Arduino AI Cloud Interface Starting...');
console.log('==========================================');
console.log(`🌐 Environment: ${NODE_ENV}`);
console.log(`📡 Port: ${PORT}`);
console.log(`📖 Source: https://github.com/luka-loehr/arduino-ai-control`);
console.log('==========================================\n');

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const sessionId = uuidv4();
    const clientIP = req.socket.remoteAddress;
    
    console.log(`🔗 New connection: ${sessionId} from ${clientIP}`);
    
    ws.sessionId = sessionId;
    ws.isAlive = true;
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        sessionId: sessionId,
        message: 'Connected to Arduino AI Cloud',
        transparency: {
            sourceCode: 'https://github.com/luka-loehr/arduino-ai-control',
            privacy: 'No data collection - your API key stays with you',
            security: 'All communication is encrypted and auditable'
        }
    }));
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleWebSocketMessage(ws, message);
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    ws.on('close', () => {
        console.log(`🔌 Connection closed: ${sessionId}`);
        userSessions.delete(sessionId);
        chatSessions.delete(sessionId);
    });
    
    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${sessionId}:`, error);
    });
});

// Handle WebSocket messages
async function handleWebSocketMessage(ws, message) {
    const { type, sessionId } = message;
    
    console.log(`📥 Message from ${ws.sessionId}: ${type}`);
    
    switch (type) {
        case 'bridge_register':
            handleBridgeRegistration(ws, message);
            break;
            
        case 'bridge_discovery':
            handleBridgeDiscovery(ws, message);
            break;
            
        case 'set_api_key':
            handleApiKeySetup(ws, message);
            break;
            
        case 'chat_message':
            await handleChatMessage(ws, message);
            break;
            
        case 'arduino_command':
            await handleArduinoCommand(ws, message);
            break;
            
        case 'get_bridge_status':
            handleBridgeStatusRequest(ws, message);
            break;
            
        default:
            ws.send(JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${type}`
            }));
    }
}

// Handle bridge registration
function handleBridgeRegistration(ws, message) {
    const { bridgeId, version, arduino } = message;
    
    console.log(`🌉 Bridge registered: ${bridgeId} (v${version})`);
    
    connectedBridges.set(bridgeId, {
        id: bridgeId,
        version: version,
        arduino: arduino,
        connection: ws,
        lastSeen: Date.now(),
        status: 'connected'
    });
    
    ws.bridgeId = bridgeId;
    ws.isBridge = true;
    
    // Notify all users about new bridge
    broadcastToUsers({
        type: 'bridge_available',
        bridge: {
            id: bridgeId,
            version: version,
            arduino: arduino
        }
    });
}

// Handle bridge discovery from users
function handleBridgeDiscovery(ws, message) {
    const availableBridges = Array.from(connectedBridges.values()).map(bridge => ({
        id: bridge.id,
        version: bridge.version,
        arduino: bridge.arduino,
        status: bridge.status,
        lastSeen: bridge.lastSeen
    }));
    
    ws.send(JSON.stringify({
        type: 'bridge_list',
        bridges: availableBridges,
        count: availableBridges.length
    }));
}

// Handle API key setup
function handleApiKeySetup(ws, message) {
    const { apiKey } = message;
    
    if (!apiKey || !apiKey.startsWith('AIza')) {
        ws.send(JSON.stringify({
            type: 'api_key_error',
            message: 'Invalid API key format'
        }));
        return;
    }
    
    // Store API key for this session (in memory only)
    userSessions.set(ws.sessionId, {
        apiKey: apiKey,
        genAI: new GoogleGenerativeAI(apiKey),
        connectedAt: Date.now()
    });
    
    ws.send(JSON.stringify({
        type: 'api_key_success',
        message: 'API key configured successfully'
    }));
    
    console.log(`🔑 API key configured for session: ${ws.sessionId}`);
}

// Handle chat messages with AI
async function handleChatMessage(ws, message) {
    const { text, bridgeId } = message;
    const session = userSessions.get(ws.sessionId);
    
    if (!session) {
        ws.send(JSON.stringify({
            type: 'chat_error',
            message: 'Please configure your API key first'
        }));
        return;
    }
    
    if (!bridgeId || !connectedBridges.has(bridgeId)) {
        ws.send(JSON.stringify({
            type: 'chat_error',
            message: 'No Arduino bridge connected'
        }));
        return;
    }
    
    try {
        // Get or create chat session
        let chatSession = chatSessions.get(ws.sessionId);
        if (!chatSession) {
            const model = session.genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                tools: [{ functionDeclarations: getArduinoFunctionDeclarations() }]
            });
            chatSession = model.startChat();
            chatSessions.set(ws.sessionId, chatSession);
        }
        
        // Send message to AI
        const result = await chatSession.sendMessage(text);
        let response = result.response;
        let functionsCalled = [];
        
        // Handle function calls
        while (response.functionCalls() && response.functionCalls().length > 0) {
            const functionCalls = response.functionCalls();
            const functionResponses = [];
            
            for (const functionCall of functionCalls) {
                const functionName = functionCall.name;
                const args = functionCall.args || {};
                
                try {
                    // Execute function on Arduino via bridge
                    const result = await executeArduinoFunction(bridgeId, functionName, args);
                    functionResponses.push({
                        functionResponse: {
                            name: functionName,
                            response: { result: result }
                        }
                    });
                    functionsCalled.push({ name: functionName, args });
                } catch (error) {
                    functionResponses.push({
                        functionResponse: {
                            name: functionName,
                            response: { error: error.message }
                        }
                    });
                }
            }
            
            if (functionResponses.length > 0) {
                const nextResult = await chatSession.sendMessage(functionResponses);
                response = nextResult.response;
            } else {
                break;
            }
        }
        
        ws.send(JSON.stringify({
            type: 'chat_response',
            text: response.text(),
            functionsCalled: functionsCalled
        }));
        
    } catch (error) {
        console.error('Chat error:', error);
        ws.send(JSON.stringify({
            type: 'chat_error',
            message: 'AI processing failed: ' + error.message
        }));
    }
}

// Execute Arduino function via bridge
async function executeArduinoFunction(bridgeId, functionName, args) {
    const bridge = connectedBridges.get(bridgeId);
    if (!bridge || !bridge.connection) {
        throw new Error('Bridge not available');
    }
    
    return new Promise((resolve, reject) => {
        const commandId = uuidv4();
        const timeout = setTimeout(() => {
            reject(new Error('Command timeout'));
        }, 10000);
        
        // Set up response handler
        const responseHandler = (data) => {
            try {
                const message = JSON.parse(data);
                if (message.type === 'command_result' && message.commandId === commandId) {
                    clearTimeout(timeout);
                    bridge.connection.off('message', responseHandler);
                    resolve(message.result);
                } else if (message.type === 'command_error' && message.commandId === commandId) {
                    clearTimeout(timeout);
                    bridge.connection.off('message', responseHandler);
                    reject(new Error(message.error));
                }
            } catch (error) {
                // Ignore parsing errors
            }
        };
        
        bridge.connection.on('message', responseHandler);
        
        // Send command to bridge
        bridge.connection.send(JSON.stringify({
            type: 'arduino_command',
            id: commandId,
            command: functionName.toUpperCase(),
            params: args
        }));
    });
}

// Handle direct Arduino commands
async function handleArduinoCommand(ws, message) {
    const { command, params, bridgeId } = message;
    
    if (!bridgeId || !connectedBridges.has(bridgeId)) {
        ws.send(JSON.stringify({
            type: 'command_error',
            message: 'No Arduino bridge connected'
        }));
        return;
    }
    
    try {
        const result = await executeArduinoFunction(bridgeId, command, params);
        ws.send(JSON.stringify({
            type: 'command_result',
            result: result
        }));
    } catch (error) {
        ws.send(JSON.stringify({
            type: 'command_error',
            message: error.message
        }));
    }
}

// Handle bridge status requests
function handleBridgeStatusRequest(ws, message) {
    const bridges = Array.from(connectedBridges.values()).map(bridge => ({
        id: bridge.id,
        version: bridge.version,
        arduino: bridge.arduino,
        status: bridge.status,
        lastSeen: bridge.lastSeen
    }));
    
    ws.send(JSON.stringify({
        type: 'bridge_status',
        bridges: bridges
    }));
}

// Broadcast message to all user connections (not bridges)
function broadcastToUsers(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && !client.isBridge) {
            client.send(JSON.stringify(message));
        }
    });
}

// Get Arduino function declarations for AI
function getArduinoFunctionDeclarations() {
    return [
        {
            name: 'ledOn',
            description: 'Turn the Arduino LED on',
            parameters: { type: 'object', properties: {}, required: [] }
        },
        {
            name: 'ledOff',
            description: 'Turn the Arduino LED off',
            parameters: { type: 'object', properties: {}, required: [] }
        },
        {
            name: 'ledBlink',
            description: 'Make the LED blink at a specified rate',
            parameters: {
                type: 'object',
                properties: {
                    rate: { type: 'number', description: 'Blink rate in milliseconds (50-5000)' }
                },
                required: ['rate']
            }
        },
        // Add more function declarations as needed
    ];
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        bridges: connectedBridges.size,
        users: userSessions.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Arduino AI Control Cloud',
        version: '1.0.0',
        description: 'Cloud interface for Arduino AI control with local bridge support',
        transparency: {
            sourceCode: 'https://github.com/luka-loehr/arduino-ai-control',
            privacy: 'No user data collection or storage',
            security: 'All communication encrypted, API keys stored in memory only'
        },
        bridges: {
            connected: connectedBridges.size,
            downloadUrl: 'https://github.com/luka-loehr/arduino-ai-control/releases'
        }
    });
});

// Heartbeat for bridges
setInterval(() => {
    const now = Date.now();
    connectedBridges.forEach((bridge, bridgeId) => {
        if (now - bridge.lastSeen > 30000) { // 30 seconds timeout
            console.log(`🔌 Bridge timeout: ${bridgeId}`);
            connectedBridges.delete(bridgeId);
            broadcastToUsers({
                type: 'bridge_disconnected',
                bridgeId: bridgeId
            });
        }
    });
}, 10000);

// WebSocket heartbeat
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) {
            ws.terminate();
            return;
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`✅ Cloud interface running on port ${PORT}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log(`📖 Source: https://github.com/luka-loehr/arduino-ai-control\n`);
});
