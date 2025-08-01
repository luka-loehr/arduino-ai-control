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

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd arduino-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy the `.env.example` file to `.env` in the `arduino-control-app` directory
   - Add your Google Gemini API key:
     ```
     GOOGLE_API_KEY=your_api_key_here
     ```

4. **Upload Arduino sketch**:
   - Open `arduino-control-app/arduino-serial/arduino-serial.ino` in Arduino IDE
   - Upload to your Arduino board

5. **Start the application**:
   ```bash
   npm run dev
   ```

6. **Test your setup** (optional):
   ```bash
   ./test-setup.js
   ```

7. **Open your browser** and navigate to `http://localhost:3000`

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
