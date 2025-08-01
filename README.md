# Arduino AI Control System

An intelligent Arduino control system that allows you to control Arduino devices using natural language through an AI-powered web interface. The system uses Google's Gemini AI to interpret commands and execute them on connected Arduino hardware.

## Features

### 🤖 AI-Powered Control
- **Natural Language Interface**: Control your Arduino using plain English commands
- **Google Gemini Integration**: Advanced AI understanding of hardware control requests
- **Real-time Communication**: WebSocket-based instant feedback and status updates

### 🧙‍♂️ Intelligent Setup Wizard
- **Guided Setup**: Step-by-step wizard walks you through the entire setup process
- **API Key Management**: Secure in-browser API key configuration with validation
- **Arduino Detection**: Automatic detection and selection of connected Arduino boards
- **One-Click Firmware Upload**: Automated compilation and upload of Arduino firmware
- **System Testing**: Built-in tests to verify everything is working correctly
- **Clean Interface**: Disabled controls until setup is complete, preventing confusion

### 💡 Advanced LED Control
- **Basic Control**: Simple on/off commands
- **Blinking Effects**: Customizable blink rates (50ms to 5000ms)
- **Fading Effects**: Smooth fade in/out with adjustable speed
- **Morse Code**: Display text messages in morse code
- **Custom Patterns**: Binary patterns for complex light sequences
- **Real-time Status**: Live LED state visualization

### 📍 Comprehensive Pin Control
- **Digital I/O**: Read and write digital pins with mode configuration
- **Analog I/O**: PWM output and analog input reading
- **Servo Control**: Precise servo motor positioning (0-180 degrees)
- **Pin Monitoring**: Real-time pin state visualization
- **Safety Validation**: Input validation and error handling

### 🌐 Modern Web Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Dashboard**: Live system status and hardware monitoring
- **Quick Controls**: One-click buttons for common operations
- **Setup Integration**: Built-in Arduino setup and firmware management
- **Progress Tracking**: Visual feedback for all operations

## System Requirements

- **Node.js** (v14 or higher)
- **Arduino board** (tested with Arduino Uno, Nano, Mega)
- **USB cable** to connect Arduino to computer
- **Google Gemini API key** (free from Google AI Studio)
- **arduino-cli** (automatically installed by setup wizard)

## Hardware Setup

1. **Connect your Arduino** to your computer via USB cable
2. **Ensure drivers are installed** (usually automatic on modern systems)
3. **Start the application** - the setup wizard will handle the rest!

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/luka-loehr/arduino-ai-control.git
   cd arduino-ai-control
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

5. **Follow the Setup Wizard**:
   - The web interface will guide you through the complete setup process
   - Configure your Google Gemini API key
   - Detect and connect to your Arduino
   - Upload firmware automatically
   - Test the system

That's it! The setup wizard handles everything for you.

## Manual Setup (Advanced Users)

If you prefer manual setup or need to troubleshoot:

1. **Get a Google Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a free API key
   - Keep it handy for the setup wizard

2. **Prepare your Arduino**:
   - Connect your Arduino via USB
   - Ensure it's recognized by your system
   - The setup wizard will handle firmware upload

3. **Test your setup**:
   ```bash
   ./test-setup.js
   ```

4. **Test Arduino functions** (after setup):
   ```bash
   node test-arduino-functions.js
   ```

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
