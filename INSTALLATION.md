# 🚀 Arduino AI Control - Installation Guide

## 🎯 **Quick Start (5 Minutes)**

### **Step 1: Download Arduino Bridge**
Choose your operating system:

- **Windows**: [arduino-bridge-windows.exe](https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-windows.exe)
- **macOS**: [arduino-bridge-macos.dmg](https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-macos.dmg)
- **Linux**: [arduino-bridge-linux.deb](https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-linux.deb)

### **Step 2: Install & Run**
- **Windows**: Double-click the `.exe` file and follow the installer
- **macOS**: Open the `.dmg` file and drag to Applications folder
- **Linux**: `sudo dpkg -i arduino-bridge-linux.deb`

### **Step 3: Connect Arduino**
- Connect your Arduino to your computer via USB
- The bridge will automatically detect it

### **Step 4: Get API Key**
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a free API key (no credit card required)

### **Step 5: Start Controlling**
- Visit [arduino-control.ai](https://arduino-control.ai)
- Enter your API key
- Start controlling your Arduino with natural language!

---

## 🔧 **Detailed Installation Instructions**

### **Windows Installation**

1. **Download the installer**:
   ```
   https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-windows.exe
   ```

2. **Run the installer**:
   - Double-click `arduino-bridge-windows.exe`
   - Windows may show a security warning (this is normal for new software)
   - Click "More info" → "Run anyway" if prompted
   - Follow the installation wizard

3. **First run**:
   - The bridge will start automatically after installation
   - Look for the Arduino Bridge icon in your system tray
   - A local status page will open at `http://localhost:8080`

4. **Connect Arduino**:
   - Connect your Arduino via USB
   - Windows will automatically install drivers (may take a minute)
   - The bridge will detect your Arduino automatically

### **macOS Installation**

1. **Download the disk image**:
   ```
   https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-macos.dmg
   ```

2. **Install the application**:
   - Double-click `arduino-bridge-macos.dmg`
   - Drag "Arduino Bridge" to your Applications folder
   - Eject the disk image

3. **First run**:
   - Open Applications → Arduino Bridge
   - macOS may show a security warning for unsigned apps
   - Go to System Preferences → Security & Privacy → General
   - Click "Open Anyway" next to the Arduino Bridge warning

4. **Grant permissions**:
   - macOS may ask for permission to access USB devices
   - Click "Allow" to enable Arduino communication

### **Linux Installation**

#### **Ubuntu/Debian (.deb package)**:
```bash
# Download
wget https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/arduino-bridge-linux.deb

# Install
sudo dpkg -i arduino-bridge-linux.deb

# Fix dependencies if needed
sudo apt-get install -f

# Run
arduino-bridge
```

#### **Other Linux Distributions (from source)**:
```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone https://github.com/luka-loehr/arduino-ai-control.git
cd arduino-ai-control/arduino-bridge
npm install
npm start
```

#### **Add user to dialout group** (for serial port access):
```bash
sudo usermod -a -G dialout $USER
# Log out and log back in for changes to take effect
```

---

## 🔍 **Security & Trust Verification**

### **Before Installing - Verify the Software**

#### **1. Check File Hashes**
```bash
# Download checksums
curl -L https://github.com/luka-loehr/arduino-ai-control/releases/latest/download/checksums.txt

# Verify your download (example for Windows)
sha256sum arduino-bridge-windows.exe
# Compare with the hash in checksums.txt
```

#### **2. Review Source Code**
- **Complete source**: https://github.com/luka-loehr/arduino-ai-control
- **Bridge code**: https://github.com/luka-loehr/arduino-ai-control/tree/main/arduino-bridge
- **Build scripts**: https://github.com/luka-loehr/arduino-ai-control/tree/main/.github/workflows

#### **3. Build from Source** (Maximum Security)
```bash
git clone https://github.com/luka-loehr/arduino-ai-control.git
cd arduino-ai-control/arduino-bridge

# Review the code
cat bridge.js  # Main application
cat package.json  # Dependencies

# Install and run
npm install
npm start
```

### **After Installing - Monitor Behavior**

#### **1. Check Network Activity**
```bash
# Linux/macOS - monitor network connections
sudo netstat -tulpn | grep arduino-bridge

# Windows - use Resource Monitor
# Search for "Resource Monitor" → Network tab
```

#### **2. Monitor System Resources**
- **Task Manager** (Windows) or **Activity Monitor** (macOS)
- Look for "Arduino Bridge" process
- Should use minimal CPU and memory
- Should only access serial ports

#### **3. Verify Local Status Page**
- Open http://localhost:8080
- Review bridge status and transparency information
- Check that only expected Arduino ports are accessed

---

## 🛠️ **Troubleshooting**

### **Bridge Won't Start**

#### **Windows**:
```cmd
# Run from command prompt to see error messages
cd "C:\Program Files\Arduino Bridge"
arduino-bridge.exe
```

#### **macOS**:
```bash
# Run from terminal to see error messages
/Applications/Arduino\ Bridge.app/Contents/MacOS/arduino-bridge
```

#### **Linux**:
```bash
# Check service status
systemctl status arduino-bridge

# Run manually to see errors
arduino-bridge
```

### **Arduino Not Detected**

1. **Check USB Connection**:
   - Try a different USB cable
   - Try a different USB port
   - Ensure Arduino is powered on

2. **Check Drivers**:
   - **Windows**: Install Arduino IDE (includes drivers)
   - **macOS**: Usually automatic
   - **Linux**: Add user to `dialout` group

3. **Check Permissions**:
   ```bash
   # Linux - check serial port permissions
   ls -l /dev/ttyACM* /dev/ttyUSB*
   
   # Should show your user in the group
   groups $USER
   ```

### **Cloud Connection Issues**

1. **Check Internet Connection**:
   - Ensure you can access https://arduino-control.ai
   - Check firewall settings

2. **Check Bridge Status**:
   - Visit http://localhost:8080
   - Verify cloud connection status

3. **Restart Bridge**:
   - Close and restart the Arduino Bridge application

### **API Key Issues**

1. **Invalid Key Format**:
   - API keys start with "AIza"
   - Should be about 39 characters long
   - Get a new key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. **Quota Exceeded**:
   - Check your Google AI Studio quota
   - Free tier has generous limits but they do exist

---

## 🔄 **Updating the Bridge**

### **Automatic Updates** (Coming Soon)
The bridge will check for updates automatically and notify you when new versions are available.

### **Manual Updates**
1. Download the latest version from GitHub releases
2. Close the current bridge application
3. Install the new version (will replace the old one)
4. Restart the bridge

### **Update Notifications**
- Check the local status page at http://localhost:8080
- Follow the GitHub repository for release notifications
- Subscribe to releases: https://github.com/luka-loehr/arduino-ai-control/releases

---

## 🆘 **Getting Help**

### **Community Support**
- **GitHub Issues**: https://github.com/luka-loehr/arduino-ai-control/issues
- **Discussions**: https://github.com/luka-loehr/arduino-ai-control/discussions
- **Documentation**: https://github.com/luka-loehr/arduino-ai-control/wiki

### **Reporting Bugs**
When reporting issues, please include:
- Operating system and version
- Arduino model
- Bridge version (shown at http://localhost:8080)
- Error messages or logs
- Steps to reproduce the problem

### **Security Issues**
- **Email**: security@arduino-control.ai
- **Responsible disclosure**: We appreciate security researchers
- **Bug bounty**: Currently informal - we'll credit you in releases

---

## 🎉 **You're Ready!**

Once installed:
1. ✅ Bridge running on your computer
2. ✅ Arduino connected and detected
3. ✅ Visit https://arduino-control.ai
4. ✅ Enter your Google API key
5. ✅ Start controlling your Arduino with AI!

**Example commands to try**:
- "Turn on the LED"
- "Blink the light 5 times"
- "Fade the LED slowly"
- "Show 'HELLO' in morse code"
- "Set pin 9 to 50% brightness"

---

*Need help? Visit our [GitHub repository](https://github.com/luka-loehr/arduino-ai-control) or check the [troubleshooting guide](https://github.com/luka-loehr/arduino-ai-control/wiki/Troubleshooting).*
