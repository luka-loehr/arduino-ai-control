# Arduino AI Control System

An intelligent Arduino control system that allows you to control Arduino devices using natural language through an AI-powered web interface. The system uses Google's Gemini AI to interpret commands and execute them on connected Arduino hardware.

## Features

- **Natural Language Control**: Control your Arduino using plain English commands
- **Real-time Communication**: Instant feedback and status updates
- **Advanced LED Control**: 
  - Basic on/off control
  - Blinking with custom rates
  - Fading effects
  - Morse code display
  - Custom patterns
- **Pin Control**: Digital and analog pin manipulation
- **PWM Control**: Precise PWM output control
- **Servo Control**: Servo motor positioning
- **Custom Code Execution**: Execute custom Arduino code dynamically
- **Web Interface**: Clean, responsive web UI with real-time status indicators

## System Requirements

- Node.js (v14 or higher)
- Arduino IDE or compatible development environment
- Arduino board (tested with Arduino Uno)
- Google Gemini API key

## Hardware Setup

1. Connect your Arduino to your computer via USB
2. The Arduino should appear as `/dev/ttyACM0` on Linux systems
3. Upload the provided Arduino sketch to your board

## 🚀 Quick Start

### **Option 1: Cloud Interface (Recommended)**

1. **Visit**: [arduino-control.ai](https://arduino-control.ai) 🌐

2. **Download Arduino Bridge** for your OS:
   - [🪟 Windows](https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-windows.exe)
   - [🍎 macOS](https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-macos.dmg)
   - [🐧 Linux](https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-linux.deb)

3. **Install & run the bridge** on your computer

4. **Connect Arduino** via USB (bridge auto-detects it)

5. **Get free API key** from [Google AI Studio](https://makersuite.google.com/app/apikey) 🔑

6. **Start controlling** with natural language! 🎉

### **Option 2: Local Development**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/luka-loehr/arduino-ai-control.git
   cd arduino-ai-control/arduino-control-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

4. **Open browser** → `http://localhost:3000`

5. **Follow setup wizard** for automatic configuration

## 🔍 Why Two Options?

- **Cloud Interface**: Easy to use, no setup, always up-to-date
- **Local Development**: Full control, offline capable, development-friendly

Both options are **100% transparent** with complete source code available!

## 🔍 Complete Transparency

### **Why the Arduino Bridge?**
Web browsers **cannot access USB devices directly** for security. The bridge runs locally on your computer and provides secure communication between your Arduino and the cloud AI service.

### **What We Collect**
**Nothing.** No user accounts, no command logging, no usage analytics. Your API key stays in your browser memory only.

### **Full Source Code**
- **Main Repository**: https://github.com/luka-loehr/arduino-ai-control
- **Arduino Bridge**: https://github.com/luka-loehr/arduino-ai-control/tree/main/arduino-bridge
- **Cloud Interface**: https://github.com/luka-loehr/arduino-ai-control/tree/main/cloud-interface
- **Transparency Doc**: [TRANSPARENCY.md](TRANSPARENCY.md)

### **Security**
- ✅ **Open source** - audit every line of code
- ✅ **Local bridge** - your Arduino stays under your control
- ✅ **Encrypted communication** - all data protected in transit
- ✅ **No data storage** - nothing persisted on our servers
- ✅ **Your API key** - never sent to our servers

## Usage

### Basic Commands

- "Turn on the LED" / "Turn off the LED"
- "Make the LED blink fast" / "Blink slowly"
- "Fade the LED"
- "Show 'HELLO' in morse code"
- "Set pin 9 to output mode"
- "Write HIGH to pin 13"

### Advanced Commands

- "Set PWM on pin 9 to 128"
- "Move servo on pin 6 to 90 degrees"
- "Execute: digitalWrite(13, HIGH)"
- "Run rainbow effect continuously"

## Project Structure

```
arduino-ai/
├── arduino-control-app/           # Main application
│   ├── server.js                  # Express server with AI integration
│   ├── public/
│   │   └── index.html            # Web interface
│   ├── arduino-serial/
│   │   └── arduino-serial.ino    # Arduino firmware
│   ├── package.json              # Dependencies
│   └── .env                      # Environment variables
├── package.json                  # Root package.json
└── README.md                     # This file
```

## API Endpoints

- `POST /chat` - Send natural language commands to the AI
- `GET /led/state` - Get current LED state

## Arduino Commands

The Arduino firmware supports these serial commands:

- `ON` / `OFF` - Basic LED control
- `EXEC:code` - Execute single line of Arduino code
- `MULTI:lines:code` - Execute multiple lines (separated by |)
- `LOOP:code` - Set code to run continuously
- `RESET` - Reset Arduino to default state

## Supported Arduino Functions

- `pinMode(pin, mode)`
- `digitalWrite(pin, value)`
- `analogWrite(pin, value)`
- `digitalRead(pin)`
- `analogRead(pin)`
- `delay(ms)`
- `setRGB(r, g, b)` - RGB LED control
- `rainbow()` - Rainbow effect
- `fade(pin, speed)` - Fading effect
- `blink(pin, rate)` - Blinking effect

## Troubleshooting

### Arduino Not Found
- Ensure Arduino is connected via USB
- Check that it appears as `/dev/ttyACM0` (Linux) or update the port in `server.js`
- Verify the Arduino sketch is uploaded correctly

### Permission Issues
- On Linux, you may need to add your user to the `dialout` group:
  ```bash
  sudo usermod -a -G dialout $USER
  ```
- Log out and log back in for changes to take effect

### API Key Issues
- Ensure your Google Gemini API key is valid and has the necessary permissions
- Check that the `.env` file is in the correct location

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions, please open an issue on the GitHub repository.
