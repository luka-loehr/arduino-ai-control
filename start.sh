#!/bin/bash

# Arduino AI Control System Startup Script

echo "🤖 Arduino AI Control System"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "arduino-control-app/server.js" ]; then
    echo "❌ Please run this script from the arduino-ai root directory"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "arduino-control-app/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd arduino-control-app && npm install
    cd ..
fi

# Check if .env file exists
if [ ! -f "arduino-control-app/.env" ]; then
    echo "⚠️  .env file not found. Please create one with your Google API key:"
    echo "   cp arduino-control-app/.env.example arduino-control-app/.env"
    echo "   Then edit .env and add your Google Gemini API key"
    exit 1
fi

# Check for Arduino connection (Linux)
if [ -e "/dev/ttyACM0" ] || [ -e "/dev/ttyUSB0" ]; then
    echo "✅ Arduino device detected"
else
    echo "⚠️  No Arduino device found on /dev/ttyACM0 or /dev/ttyUSB0"
    echo "   Please ensure your Arduino is connected and the sketch is uploaded"
fi

echo "🚀 Starting Arduino AI Control Server..."
echo "   Open http://localhost:3000 in your browser"
echo ""

# Start the server
cd arduino-control-app && npm start
