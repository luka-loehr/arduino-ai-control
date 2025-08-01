/*
 * Arduino AI Control System - Advanced Firmware
 *
 * This firmware provides comprehensive control over Arduino hardware
 * through JSON-based serial communication. It supports real-time
 * hardware control, status reporting, and advanced effects.
 *
 * Features:
 * - JSON command protocol
 * - Real-time pin control and monitoring
 * - LED effects (blink, fade, morse, patterns)
 * - Servo motor control
 * - Sensor reading
 * - Status reporting
 * - Error handling and validation
 *
 * Communication Protocol:
 * Commands are sent as JSON objects:
 * {"id":"123","command":"LED_ON","params":{},"timestamp":1234567890}
 *
 * Responses are JSON objects:
 * {"id":"123","success":true,"data":{},"timestamp":1234567890}
 *
 * Upload this sketch to your Arduino before using the AI control system.
 */

#include <Arduino.h>
#include <Servo.h>

// System state
struct SystemState {
  bool ledState;
  int pinModes[20];
  int digitalValues[20];
  int analogValues[6];
  bool effectsActive[5]; // blink, fade, morse, pattern, rainbow
  unsigned long lastHeartbeat;
  String currentEffect;
} systemState;

// Command processing
String inputBuffer = "";
bool commandReady = false;

// Effect control
unsigned long effectTimers[5] = {0, 0, 0, 0, 0};
int effectCounters[5] = {0, 0, 0, 0, 0};
String morseText = "";
String patternString = "";
int blinkRate = 500;
int fadeSpeed = 5;
int fadeValue = 0;
int fadeDirection = 1;

// Servo objects
Servo servos[14];
bool servoAttached[14] = {false};

// Morse code lookup table
const char* morseCode[] = {
  ".-", "-...", "-.-.", "-..", ".", "..-.", "--.", "....", "..", ".---",
  "-.-", ".-..", "--", "-.", "---", ".--.", "--.-", ".-.", "...", "-",
  "..-", "...-", ".--", "-..-", "-.--", "--.."
};

void setup() {
  Serial.begin(9600);

  // Initialize system state
  systemState.ledState = false;
  systemState.lastHeartbeat = millis();
  systemState.currentEffect = "none";

  // Initialize pin arrays
  for (int i = 0; i < 20; i++) {
    systemState.pinModes[i] = INPUT;
    systemState.digitalValues[i] = LOW;
  }

  for (int i = 0; i < 6; i++) {
    systemState.analogValues[i] = 0;
  }

  for (int i = 0; i < 5; i++) {
    systemState.effectsActive[i] = false;
  }

  // Set up built-in LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Send ready message
  sendResponse("", true, "Arduino AI Control System Ready", "status");

  // Send initial status
  delay(1000);
  sendStatusUpdate();
}

void loop() {
  // Read serial input
  readSerialInput();

  // Process commands
  if (commandReady) {
    processCommand(inputBuffer);
    inputBuffer = "";
    commandReady = false;
  }

  // Update effects
  updateEffects();

  // Send periodic status updates
  if (millis() - systemState.lastHeartbeat > 5000) {
    sendStatusUpdate();
    systemState.lastHeartbeat = millis();
  }

  // Small delay to prevent overwhelming the serial
  delay(1);
}

// Read serial input and build command buffer
void readSerialInput() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();

    if (inChar == '\n') {
      commandReady = true;
      return;
    } else if (inChar != '\r') {
      inputBuffer += inChar;
    }

    // Prevent buffer overflow
    if (inputBuffer.length() > 500) {
      inputBuffer = "";
      sendResponse("", false, "Command too long", "error");
      return;
    }
  }
}

// Process incoming JSON commands
void processCommand(String jsonCmd) {
  // Parse JSON command
  String commandId = "";
  String command = "";

  // Simple JSON parsing (basic implementation)
  int idStart = jsonCmd.indexOf("\"id\":\"") + 6;
  int idEnd = jsonCmd.indexOf("\"", idStart);
  if (idStart > 5 && idEnd > idStart) {
    commandId = jsonCmd.substring(idStart, idEnd);
  }

  int cmdStart = jsonCmd.indexOf("\"command\":\"") + 11;
  int cmdEnd = jsonCmd.indexOf("\"", cmdStart);
  if (cmdStart > 10 && cmdEnd > cmdStart) {
    command = jsonCmd.substring(cmdStart, cmdEnd);
  }

  // Execute command
  bool success = false;
  String message = "";
  String dataType = "result";

  if (command == "PING") {
    success = true;
    message = "Pong";
  }
  else if (command == "LED_ON") {
    success = executeCommand_LED_ON();
    message = success ? "LED turned on" : "Failed to turn on LED";
  }
  else if (command == "LED_OFF") {
    success = executeCommand_LED_OFF();
    message = success ? "LED turned off" : "Failed to turn off LED";
  }
  else if (command == "LED_BLINK") {
    int rate = extractIntParam(jsonCmd, "rate", 500);
    success = executeCommand_LED_BLINK(rate);
    message = success ? "LED blinking started" : "Failed to start blinking";
  }
  else if (command == "LED_FADE") {
    int speed = extractIntParam(jsonCmd, "speed", 5);
    success = executeCommand_LED_FADE(speed);
    message = success ? "LED fading started" : "Failed to start fading";
  }
  else if (command == "LED_MORSE") {
    String text = extractStringParam(jsonCmd, "text", "");
    success = executeCommand_LED_MORSE(text);
    message = success ? "Morse code started" : "Failed to start morse code";
  }
  else if (command == "LED_PATTERN") {
    String pattern = extractStringParam(jsonCmd, "pattern", "");
    success = executeCommand_LED_PATTERN(pattern);
    message = success ? "Pattern started" : "Failed to start pattern";
  }
  else if (command == "PIN_MODE") {
    int pin = extractIntParam(jsonCmd, "pin", -1);
    String mode = extractStringParam(jsonCmd, "mode", "");
    success = executeCommand_PIN_MODE(pin, mode);
    message = success ? "Pin mode set" : "Failed to set pin mode";
  }
  else if (command == "DIGITAL_WRITE") {
    int pin = extractIntParam(jsonCmd, "pin", -1);
    int value = extractIntParam(jsonCmd, "value", -1);
    success = executeCommand_DIGITAL_WRITE(pin, value);
    message = success ? "Digital write completed" : "Failed to write digital value";
  }
  else if (command == "DIGITAL_READ") {
    int pin = extractIntParam(jsonCmd, "pin", -1);
    int value = executeCommand_DIGITAL_READ(pin);
    success = (value >= 0);
    message = success ? String(value) : "Failed to read digital value";
    dataType = "reading";
  }
  else if (command == "ANALOG_WRITE") {
    int pin = extractIntParam(jsonCmd, "pin", -1);
    int value = extractIntParam(jsonCmd, "value", -1);
    success = executeCommand_ANALOG_WRITE(pin, value);
    message = success ? "Analog write completed" : "Failed to write analog value";
  }
  else if (command == "ANALOG_READ") {
    int pin = extractIntParam(jsonCmd, "pin", -1);
    int value = executeCommand_ANALOG_READ(pin);
    success = (value >= 0);
    message = success ? String(value) : "Failed to read analog value";
    dataType = "reading";
  }
  else if (command == "SERVO_WRITE") {
    int pin = extractIntParam(jsonCmd, "pin", -1);
    int angle = extractIntParam(jsonCmd, "angle", -1);
    success = executeCommand_SERVO_WRITE(pin, angle);
    message = success ? "Servo positioned" : "Failed to position servo";
  }
  else if (command == "STOP_EFFECTS") {
    success = executeCommand_STOP_EFFECTS();
    message = "All effects stopped";
  }
  else if (command == "RESET") {
    success = executeCommand_RESET();
    message = "System reset completed";
  }
  else if (command == "STATUS") {
    success = true;
    message = "Status update";
    dataType = "status";
    sendStatusUpdate();
    return; // Status update sends its own response
  }
  else {
    success = false;
    message = "Unknown command: " + command;
  }

  // Send response
  sendResponse(commandId, success, message, dataType);
}

// Parameter extraction functions
int extractIntParam(String json, String paramName, int defaultValue) {
  String searchStr = "\"" + paramName + "\":";
  int start = json.indexOf(searchStr);
  if (start == -1) return defaultValue;

  start += searchStr.length();
  int end = start;

  // Find end of number
  while (end < json.length() && (isDigit(json.charAt(end)) || json.charAt(end) == '-')) {
    end++;
  }

  if (end > start) {
    return json.substring(start, end).toInt();
  }

  return defaultValue;
}

String extractStringParam(String json, String paramName, String defaultValue) {
  String searchStr = "\"" + paramName + "\":\"";
  int start = json.indexOf(searchStr);
  if (start == -1) return defaultValue;

  start += searchStr.length();
  int end = json.indexOf("\"", start);

  if (end > start) {
    return json.substring(start, end);
  }

  return defaultValue;
}

// Send JSON response
void sendResponse(String commandId, bool success, String message, String type) {
  Serial.print("{\"id\":\"");
  Serial.print(commandId);
  Serial.print("\",\"success\":");
  Serial.print(success ? "true" : "false");
  Serial.print(",\"message\":\"");
  Serial.print(message);
  Serial.print("\",\"type\":\"");
  Serial.print(type);
  Serial.print("\",\"timestamp\":");
  Serial.print(millis());
  Serial.println("}");
}

// Send status update
void sendStatusUpdate() {
  Serial.print("{\"type\":\"status\",\"data\":{");
  Serial.print("\"led\":");
  Serial.print(systemState.ledState ? "true" : "false");
  Serial.print(",\"pins\":{");

  bool first = true;
  for (int i = 0; i < 20; i++) {
    if (systemState.pinModes[i] != INPUT || systemState.digitalValues[i] != LOW) {
      if (!first) Serial.print(",");
      Serial.print("\"");
      Serial.print(i);
      Serial.print("\":{\"mode\":\"");
      Serial.print(systemState.pinModes[i] == OUTPUT ? "OUTPUT" : "INPUT");
      Serial.print("\",\"digitalValue\":");
      Serial.print(systemState.digitalValues[i]);
      Serial.print("}");
      first = false;
    }
  }

  Serial.print("},\"effects\":{");
  Serial.print("\"blinking\":");
  Serial.print(systemState.effectsActive[0] ? "true" : "false");
  Serial.print(",\"fading\":");
  Serial.print(systemState.effectsActive[1] ? "true" : "false");
  Serial.print(",\"morse\":");
  Serial.print(systemState.effectsActive[2] ? "true" : "false");
  Serial.print(",\"pattern\":");
  Serial.print(systemState.effectsActive[3] ? "true" : "false");
  Serial.print(",\"rainbow\":");
  Serial.print(systemState.effectsActive[4] ? "true" : "false");
  Serial.print("},\"currentEffect\":\"");
  Serial.print(systemState.currentEffect);
  Serial.print("\",\"timestamp\":");
  Serial.print(millis());
  Serial.println("}}");
}

// Command execution functions
bool executeCommand_LED_ON() {
  digitalWrite(LED_BUILTIN, HIGH);
  systemState.ledState = true;
  systemState.currentEffect = "on";
  stopAllEffects();
  return true;
}

bool executeCommand_LED_OFF() {
  digitalWrite(LED_BUILTIN, LOW);
  systemState.ledState = false;
  systemState.currentEffect = "off";
  stopAllEffects();
  return true;
}

bool executeCommand_LED_BLINK(int rate) {
  if (rate < 50 || rate > 5000) return false;

  blinkRate = rate;
  systemState.effectsActive[0] = true;
  systemState.currentEffect = "blink";
  effectTimers[0] = millis();
  return true;
}

bool executeCommand_LED_FADE(int speed) {
  if (speed < 1 || speed > 10) return false;

  fadeSpeed = speed;
  systemState.effectsActive[1] = true;
  systemState.currentEffect = "fade";
  effectTimers[1] = millis();
  return true;
}

bool executeCommand_LED_MORSE(String text) {
  if (text.length() == 0 || text.length() > 50) return false;

  morseText = text;
  morseText.toUpperCase();
  systemState.effectsActive[2] = true;
  systemState.currentEffect = "morse";
  effectTimers[2] = millis();
  effectCounters[2] = 0; // Character index
  return true;
}

bool executeCommand_LED_PATTERN(String pattern) {
  if (pattern.length() == 0 || pattern.length() > 100) return false;

  // Validate pattern (only 0s and 1s)
  for (int i = 0; i < pattern.length(); i++) {
    if (pattern.charAt(i) != '0' && pattern.charAt(i) != '1') {
      return false;
    }
  }

  patternString = pattern;
  systemState.effectsActive[3] = true;
  systemState.currentEffect = "pattern";
  effectTimers[3] = millis();
  effectCounters[3] = 0; // Pattern index
  return true;
}

bool executeCommand_PIN_MODE(int pin, String mode) {
  if (pin < 0 || pin > 19) return false;

  if (mode == "OUTPUT") {
    pinMode(pin, OUTPUT);
    systemState.pinModes[pin] = OUTPUT;
  } else if (mode == "INPUT") {
    pinMode(pin, INPUT);
    systemState.pinModes[pin] = INPUT;
  } else if (mode == "INPUT_PULLUP") {
    pinMode(pin, INPUT_PULLUP);
    systemState.pinModes[pin] = INPUT_PULLUP;
  } else {
    return false;
  }

  return true;
}

bool executeCommand_DIGITAL_WRITE(int pin, int value) {
  if (pin < 0 || pin > 19 || (value != 0 && value != 1)) return false;

  digitalWrite(pin, value ? HIGH : LOW);
  systemState.digitalValues[pin] = value;
  return true;
}

int executeCommand_DIGITAL_READ(int pin) {
  if (pin < 0 || pin > 19) return -1;

  int value = digitalRead(pin);
  systemState.digitalValues[pin] = value;
  return value;
}

bool executeCommand_ANALOG_WRITE(int pin, int value) {
  // Check if pin supports PWM
  if ((pin != 3 && pin != 5 && pin != 6 && pin != 9 && pin != 10 && pin != 11) ||
      value < 0 || value > 255) {
    return false;
  }

  analogWrite(pin, value);
  return true;
}

int executeCommand_ANALOG_READ(int pin) {
  if (pin < 0 || pin > 5) return -1;

  int value = analogRead(pin);
  systemState.analogValues[pin] = value;
  return value;
}

bool executeCommand_SERVO_WRITE(int pin, int angle) {
  if (pin < 2 || pin > 13 || angle < 0 || angle > 180) return false;

  if (!servoAttached[pin]) {
    servos[pin].attach(pin);
    servoAttached[pin] = true;
  }

  servos[pin].write(angle);
  return true;
}

bool executeCommand_STOP_EFFECTS() {
  stopAllEffects();
  return true;
}

bool executeCommand_RESET() {
  // Stop all effects
  stopAllEffects();

  // Reset LED
  digitalWrite(LED_BUILTIN, LOW);
  systemState.ledState = false;

  // Reset all pins to INPUT
  for (int i = 0; i < 20; i++) {
    pinMode(i, INPUT);
    systemState.pinModes[i] = INPUT;
    systemState.digitalValues[i] = LOW;
  }

  // Detach servos
  for (int i = 0; i < 14; i++) {
    if (servoAttached[i]) {
      servos[i].detach();
      servoAttached[i] = false;
    }
  }

  systemState.currentEffect = "none";
  return true;
}

// Helper functions
void stopAllEffects() {
  for (int i = 0; i < 5; i++) {
    systemState.effectsActive[i] = false;
    effectTimers[i] = 0;
    effectCounters[i] = 0;
  }
}

// Update all active effects
void updateEffects() {
  unsigned long currentTime = millis();

  // Blink effect
  if (systemState.effectsActive[0]) {
    if (currentTime - effectTimers[0] >= blinkRate) {
      systemState.ledState = !systemState.ledState;
      digitalWrite(LED_BUILTIN, systemState.ledState ? HIGH : LOW);
      effectTimers[0] = currentTime;
    }
  }

  // Fade effect
  if (systemState.effectsActive[1]) {
    if (currentTime - effectTimers[1] >= (100 / fadeSpeed)) {
      fadeValue += fadeDirection * fadeSpeed;
      if (fadeValue <= 0) {
        fadeValue = 0;
        fadeDirection = 1;
      } else if (fadeValue >= 255) {
        fadeValue = 255;
        fadeDirection = -1;
      }
      analogWrite(LED_BUILTIN, fadeValue);
      effectTimers[1] = currentTime;
    }
  }

  // Morse code effect
  if (systemState.effectsActive[2]) {
    updateMorseEffect(currentTime);
  }

  // Pattern effect
  if (systemState.effectsActive[3]) {
    if (currentTime - effectTimers[3] >= 100) { // 100ms per pattern bit
      if (effectCounters[3] < patternString.length()) {
        bool ledState = (patternString.charAt(effectCounters[3]) == '1');
        digitalWrite(LED_BUILTIN, ledState ? HIGH : LOW);
        systemState.ledState = ledState;
        effectCounters[3]++;
      } else {
        effectCounters[3] = 0; // Repeat pattern
      }
      effectTimers[3] = currentTime;
    }
  }
}

// Morse code effect implementation
void updateMorseEffect(unsigned long currentTime) {
  static int charIndex = 0;
  static int morseIndex = 0;
  static bool inSpace = false;
  static int spaceType = 0; // 0=none, 1=letter, 2=word

  if (currentTime - effectTimers[2] >= 100) { // 100ms timing unit
    if (inSpace) {
      digitalWrite(LED_BUILTIN, LOW);
      systemState.ledState = false;

      if (spaceType == 1 && currentTime - effectTimers[2] >= 300) { // Letter space
        inSpace = false;
        charIndex++;
        morseIndex = 0;
      } else if (spaceType == 2 && currentTime - effectTimers[2] >= 700) { // Word space
        inSpace = false;
        charIndex++;
        morseIndex = 0;
      }
    } else {
      if (charIndex >= morseText.length()) {
        charIndex = 0; // Repeat message
        morseIndex = 0;
      }

      char currentChar = morseText.charAt(charIndex);

      if (currentChar == ' ') {
        inSpace = true;
        spaceType = 2; // Word space
        effectTimers[2] = currentTime;
      } else if (currentChar >= 'A' && currentChar <= 'Z') {
        String morse = morseCode[currentChar - 'A'];

        if (morseIndex < morse.length()) {
          digitalWrite(LED_BUILTIN, HIGH);
          systemState.ledState = true;

          // Dot = 100ms, Dash = 300ms
          int duration = (morse.charAt(morseIndex) == '.') ? 100 : 300;

          if (currentTime - effectTimers[2] >= duration) {
            morseIndex++;
            if (morseIndex >= morse.length()) {
              inSpace = true;
              spaceType = 1; // Letter space
            }
            effectTimers[2] = currentTime;
          }
        }
      } else {
        // Skip unknown characters
        charIndex++;
      }
    }

    if (!inSpace) {
      effectTimers[2] = currentTime;
    }
  }
}