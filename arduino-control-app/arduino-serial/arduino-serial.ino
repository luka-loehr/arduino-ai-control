/*
 * Arduino AI Control System - Dynamic Code Executor
 *
 * This sketch allows an AI system to execute Arduino code in real-time
 * through serial communication. It supports various commands and provides
 * a flexible platform for AI-controlled hardware interactions.
 *
 * Supported Commands:
 * - EXEC:code - Execute single line of Arduino code
 * - MULTI:lines:code - Execute multiple lines of code (separated by |)
 * - LOOP:code - Set code to run continuously in the main loop
 * - RESET - Reset Arduino to default state and clear all custom code
 * - ON/OFF - Legacy LED control commands
 *
 * Upload this sketch to your Arduino before running the AI control system.
 */

#include <Arduino.h>

String command = "";
bool commandComplete = false;
String loopCode = "";
bool hasLoopCode = false;

// Variables accessible to dynamic code
int ledPin = LED_BUILTIN;
int pins[20];
int analogPins[6];
unsigned long timers[10];
int counters[10];
bool flags[10];
int pwmValue = 0;
int fadeAmount = 5;
float sensorValue = 0;

// Rainbow effect variables
int redPin = 9;
int greenPin = 10;
int bluePin = 11;
int hue = 0;

void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Initialize arrays
  for (int i = 0; i < 20; i++) pins[i] = 0;
  for (int i = 0; i < 6; i++) analogPins[i] = 0;
  for (int i = 0; i < 10; i++) {
    timers[i] = 0;
    counters[i] = 0;
    flags[i] = false;
  }
  
  Serial.println("Arduino Dynamic Executor Ready");
  Serial.println("Variables: ledPin, pins[20], analogPins[6], timers[10], counters[10], flags[10]");
  Serial.println("Functions: setRGB(r,g,b), rainbow(), fade(pin,speed), blink(pin,rate)");
}

void loop() {
  // Read serial commands
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n') {
      commandComplete = true;
    } else {
      command += inChar;
    }
  }

  // Process complete command
  if (commandComplete) {
    processCommand(command);
    command = "";
    commandComplete = false;
  }

  // Execute loop code if set
  if (hasLoopCode) {
    executeCode(loopCode);
  }
  
  // Always available functions
  updateEffects();
}

void processCommand(String cmd) {
  cmd.trim();
  
  if (cmd.startsWith("EXEC:")) {
    String code = cmd.substring(5);
    executeCode(code);
    Serial.println("Executed: " + code);
  }
  else if (cmd.startsWith("MULTI:")) {
    int colonPos = cmd.indexOf(':', 6);
    if (colonPos > 0) {
      int lines = cmd.substring(6, colonPos).toInt();
      String code = cmd.substring(colonPos + 1);
      // Replace | with newlines for multi-line code
      code.replace("|", "\n");
      executeCode(code);
      Serial.println("Executed " + String(lines) + " lines");
    }
  }
  else if (cmd.startsWith("LOOP:")) {
    loopCode = cmd.substring(5);
    hasLoopCode = true;
    Serial.println("Loop code set: " + loopCode);
  }
  else if (cmd == "RESET") {
    loopCode = "";
    hasLoopCode = false;
    // Reset all pins
    for (int i = 0; i < 20; i++) {
      pinMode(i, INPUT);
      digitalWrite(i, LOW);
    }
    Serial.println("Reset complete");
  }
  else {
    // Legacy commands for compatibility
    if (cmd == "ON" || cmd == "1") {
      digitalWrite(LED_BUILTIN, HIGH);
      Serial.println("LED ON");
    }
    else if (cmd == "OFF" || cmd == "0") {
      digitalWrite(LED_BUILTIN, LOW);
      Serial.println("LED OFF");
    }
  }
}

void executeCode(String code) {
  // Basic code execution - parse and execute common Arduino commands
  code.trim();
  
  // pinMode
  if (code.startsWith("pinMode(")) {
    int start = 8;
    int comma = code.indexOf(',', start);
    int end = code.indexOf(')', comma);
    if (comma > 0 && end > 0) {
      int pin = code.substring(start, comma).toInt();
      String mode = code.substring(comma + 1, end);
      mode.trim();
      if (mode == "OUTPUT") pinMode(pin, OUTPUT);
      else if (mode == "INPUT") pinMode(pin, INPUT);
      else if (mode == "INPUT_PULLUP") pinMode(pin, INPUT_PULLUP);
    }
  }
  // digitalWrite
  else if (code.startsWith("digitalWrite(")) {
    int start = 13;
    int comma = code.indexOf(',', start);
    int end = code.indexOf(')', comma);
    if (comma > 0 && end > 0) {
      int pin = code.substring(start, comma).toInt();
      String value = code.substring(comma + 1, end);
      value.trim();
      digitalWrite(pin, value == "HIGH" || value == "1" ? HIGH : LOW);
    }
  }
  // analogWrite
  else if (code.startsWith("analogWrite(")) {
    int start = 12;
    int comma = code.indexOf(',', start);
    int end = code.indexOf(')', comma);
    if (comma > 0 && end > 0) {
      int pin = code.substring(start, comma).toInt();
      int value = code.substring(comma + 1, end).toInt();
      analogWrite(pin, value);
    }
  }
  // delay
  else if (code.startsWith("delay(")) {
    int start = 6;
    int end = code.indexOf(')', start);
    if (end > 0) {
      int ms = code.substring(start, end).toInt();
      delay(ms);
    }
  }
  // digitalRead
  else if (code.startsWith("pins[") && code.indexOf("]=digitalRead(") > 0) {
    int arrayStart = 5;
    int arrayEnd = code.indexOf(']', arrayStart);
    int readStart = code.indexOf('(') + 1;
    int readEnd = code.indexOf(')', readStart);
    if (arrayEnd > 0 && readEnd > 0) {
      int index = code.substring(arrayStart, arrayEnd).toInt();
      int pin = code.substring(readStart, readEnd).toInt();
      pins[index] = digitalRead(pin);
    }
  }
  // analogRead
  else if (code.startsWith("analogPins[") && code.indexOf("]=analogRead(") > 0) {
    int arrayStart = 11;
    int arrayEnd = code.indexOf(']', arrayStart);
    int readStart = code.indexOf('(') + 1;
    int readEnd = code.indexOf(')', readStart);
    if (arrayEnd > 0 && readEnd > 0) {
      int index = code.substring(arrayStart, arrayEnd).toInt();
      int pin = code.substring(readStart, readEnd).toInt();
      analogPins[index] = analogRead(pin);
    }
  }
  // Timer operations
  else if (code.startsWith("timers[") && code.indexOf("]=millis()") > 0) {
    int arrayStart = 7;
    int arrayEnd = code.indexOf(']', arrayStart);
    if (arrayEnd > 0) {
      int index = code.substring(arrayStart, arrayEnd).toInt();
      timers[index] = millis();
    }
  }
  // Counter operations
  else if (code.startsWith("counters[") && code.indexOf("]++") > 0) {
    int arrayStart = 9;
    int arrayEnd = code.indexOf(']', arrayStart);
    if (arrayEnd > 0) {
      int index = code.substring(arrayStart, arrayEnd).toInt();
      counters[index]++;
    }
  }
  // Flag operations
  else if (code.startsWith("flags[") && code.indexOf("]=") > 0) {
    int arrayStart = 6;
    int arrayEnd = code.indexOf(']', arrayStart);
    int eqPos = code.indexOf('=', arrayEnd);
    if (arrayEnd > 0 && eqPos > 0) {
      int index = code.substring(arrayStart, arrayEnd).toInt();
      String value = code.substring(eqPos + 1);
      value.trim();
      flags[index] = (value == "true" || value == "1");
    }
  }
  // Custom functions
  else if (code.startsWith("setRGB(")) {
    int start = 7;
    int comma1 = code.indexOf(',', start);
    int comma2 = code.indexOf(',', comma1 + 1);
    int end = code.indexOf(')', comma2);
    if (comma1 > 0 && comma2 > 0 && end > 0) {
      int r = code.substring(start, comma1).toInt();
      int g = code.substring(comma1 + 1, comma2).toInt();
      int b = code.substring(comma2 + 1, end).toInt();
      setRGB(r, g, b);
    }
  }
  else if (code == "rainbow()") {
    rainbow();
  }
  else if (code.startsWith("fade(")) {
    int start = 5;
    int comma = code.indexOf(',', start);
    int end = code.indexOf(')', comma);
    if (comma > 0 && end > 0) {
      int pin = code.substring(start, comma).toInt();
      int speed = code.substring(comma + 1, end).toInt();
      fade(pin, speed);
    }
  }
  else if (code.startsWith("blink(")) {
    int start = 6;
    int comma = code.indexOf(',', start);
    int end = code.indexOf(')', comma);
    if (comma > 0 && end > 0) {
      int pin = code.substring(start, comma).toInt();
      int rate = code.substring(comma + 1, end).toInt();
      blink(pin, rate);
    }
  }
  // Conditional execution
  else if (code.startsWith("if(")) {
    int condStart = 3;
    int condEnd = code.indexOf(')', condStart);
    int thenPos = code.indexOf("then:", condEnd);
    if (condEnd > 0 && thenPos > 0) {
      String condition = code.substring(condStart, condEnd);
      String thenCode = code.substring(thenPos + 5);
      if (evaluateCondition(condition)) {
        executeCode(thenCode);
      }
    }
  }
}

bool evaluateCondition(String cond) {
  cond.trim();
  
  // Simple pin read conditions
  if (cond.startsWith("digitalRead(") && cond.indexOf(")==HIGH") > 0) {
    int start = 12;
    int end = cond.indexOf(')', start);
    if (end > 0) {
      int pin = cond.substring(start, end).toInt();
      return digitalRead(pin) == HIGH;
    }
  }
  else if (cond.startsWith("digitalRead(") && cond.indexOf(")==LOW") > 0) {
    int start = 12;
    int end = cond.indexOf(')', start);
    if (end > 0) {
      int pin = cond.substring(start, end).toInt();
      return digitalRead(pin) == LOW;
    }
  }
  // Analog comparisons
  else if (cond.startsWith("analogRead(") && cond.indexOf(")>") > 0) {
    int start = 11;
    int end = cond.indexOf(')', start);
    int gtPos = cond.indexOf('>', end);
    if (end > 0 && gtPos > 0) {
      int pin = cond.substring(start, end).toInt();
      int threshold = cond.substring(gtPos + 1).toInt();
      return analogRead(pin) > threshold;
    }
  }
  // Timer conditions
  else if (cond.startsWith("millis()-timers[") && cond.indexOf("]>") > 0) {
    int start = 16;
    int end = cond.indexOf(']', start);
    int gtPos = cond.indexOf('>', end);
    if (end > 0 && gtPos > 0) {
      int index = cond.substring(start, end).toInt();
      unsigned long duration = cond.substring(gtPos + 1).toInt();
      return (millis() - timers[index]) > duration;
    }
  }
  // Flag conditions
  else if (cond.startsWith("flags[") && cond.indexOf("]==true") > 0) {
    int start = 6;
    int end = cond.indexOf(']', start);
    if (end > 0) {
      int index = cond.substring(start, end).toInt();
      return flags[index];
    }
  }
  
  return false;
}

// Helper functions
void setRGB(int r, int g, int b) {
  analogWrite(redPin, r);
  analogWrite(greenPin, g);
  analogWrite(bluePin, b);
}

void rainbow() {
  // Convert HSV to RGB
  hue = (hue + 1) % 360;
  int h = hue / 60;
  int f = (hue % 60) * 255 / 60;
  int q = 255 - f;
  
  switch(h) {
    case 0: setRGB(255, f, 0); break;
    case 1: setRGB(q, 255, 0); break;
    case 2: setRGB(0, 255, f); break;
    case 3: setRGB(0, q, 255); break;
    case 4: setRGB(f, 0, 255); break;
    case 5: setRGB(255, 0, q); break;
  }
}

void fade(int pin, int speed) {
  pwmValue = pwmValue + (fadeAmount * speed);
  if (pwmValue <= 0 || pwmValue >= 255) {
    fadeAmount = -fadeAmount;
  }
  pwmValue = constrain(pwmValue, 0, 255);
  analogWrite(pin, pwmValue);
}

void blink(int pin, int rate) {
  static unsigned long lastBlink = 0;
  static bool blinkState = false;
  
  if (millis() - lastBlink >= rate) {
    blinkState = !blinkState;
    digitalWrite(pin, blinkState ? HIGH : LOW);
    lastBlink = millis();
  }
}

void updateEffects() {
  // This runs every loop to maintain ongoing effects
  static unsigned long lastUpdate = 0;
  
  if (millis() - lastUpdate >= 10) {
    // Update any ongoing effects here
    lastUpdate = millis();
  }
}