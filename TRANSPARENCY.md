# 🔍 Arduino AI Control - Complete Transparency Document

## 🎯 **Our Commitment to Transparency**

We believe users have the right to understand exactly how our system works, what data is collected (spoiler: none), and why certain architectural decisions were made. This document provides complete transparency about the Arduino AI Control system.

## 🏗️ **System Architecture**

### **Why Hybrid Cloud/Local Architecture?**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD (Render.com)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Web Interface │  │  AI Processing  │  │   Bridge    │ │
│  │   - React/HTML  │  │  - Gemini API   │  │  Discovery  │ │
│  │   - User Auth   │  │  - Function     │  │  - WebRTC   │ │
│  │   - Dashboard   │  │    Calling      │  │  - Registry │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ Encrypted WebSocket
                                │
┌─────────────────────────────────────────────────────────────┐
│                  USER'S COMPUTER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Arduino Bridge  │  │     Arduino     │  │   Browser   │ │
│  │ - Local Server  │──│   Hardware      │  │ - Cloud Web │ │
│  │ - USB/Serial    │  │   - Uno/Nano    │  │   Interface │ │
│  │ - Auto-Connect  │  │   - Sensors     │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **Technical Constraints That Drive This Design**

1. **Web Browser Security Model**
   - Browsers **cannot access USB/Serial devices** directly
   - This is a **fundamental security feature**, not a limitation we can work around
   - **WebUSB exists** but has very limited device support and requires HTTPS

2. **Arduino Communication Requirements**
   - Arduino communicates via **Serial over USB**
   - Requires **direct system-level access** to serial ports
   - Needs **real-time communication** for responsive control

3. **AI Processing Requirements**
   - **Large language models** require significant computational resources
   - **API costs** make cloud processing more economical
   - **Real-time inference** benefits from dedicated infrastructure

## 🔒 **Security & Privacy Analysis**

### **What Data Do We Collect?**
**Answer: NONE.**

- ❌ **No user accounts** - no registration required
- ❌ **No command logging** - your commands are not stored
- ❌ **No usage analytics** - we don't track how you use the system
- ❌ **No device fingerprinting** - we don't identify your computer
- ❌ **No API key storage** - your keys stay in your browser's memory only

### **What Data Flows Through Our System?**

1. **Your Commands** → Cloud AI → **Arduino Commands** → Your Bridge
2. **Arduino Responses** → Your Bridge → **Status Updates** → Cloud Interface
3. **Your API Key** → **Your Browser Memory Only** (never sent to our servers)

### **Data Retention Policy**
- **WebSocket messages**: Not logged or stored
- **AI conversations**: Not persisted beyond the session
- **Bridge connections**: Only connection status, no content
- **User sessions**: Cleared when you close the browser

### **What Can We Access?**
- ✅ **Bridge connection status** (online/offline)
- ✅ **Arduino connection status** (connected/disconnected)
- ❌ **Your commands or responses** (processed but not stored)
- ❌ **Your Arduino data** (never leaves your local network)
- ❌ **Your API key** (never sent to our servers)

## 🔍 **Code Transparency**

### **Complete Source Code Availability**

Every line of code is available for inspection:

- **Main Repository**: https://github.com/luka-loehr/arduino-ai-control
- **Arduino Bridge**: https://github.com/luka-loehr/arduino-ai-control/tree/main/arduino-bridge
- **Cloud Interface**: https://github.com/luka-loehr/arduino-ai-control/tree/main/cloud-interface
- **Arduino Firmware**: https://github.com/luka-loehr/arduino-ai-control/tree/main/arduino-firmware

### **What You Can Verify**

1. **Network Communication**
   - Open browser dev tools → Network tab
   - See every WebSocket message sent/received
   - Verify no unexpected data transmission

2. **Bridge Behavior**
   - Review bridge source code
   - Monitor system resources (CPU, memory, network)
   - Check which ports the bridge accesses

3. **Cloud Processing**
   - Review cloud server source code
   - Verify no data persistence
   - Check API endpoints and their behavior

## 🛡️ **Security Measures**

### **Communication Security**
- **HTTPS/WSS**: All communication encrypted in transit
- **No Authentication**: No passwords or tokens to compromise
- **Session-based**: No persistent user data
- **Rate Limiting**: Protection against abuse

### **Bridge Security**
- **Local Only**: Bridge runs only on your computer
- **Minimal Permissions**: Only needs serial port access
- **Open Source**: Every line of code auditable
- **No Network Storage**: No data written to disk

### **API Key Security**
- **User-Provided**: You control your own API key
- **Browser Memory Only**: Never transmitted to our servers
- **Session Scoped**: Cleared when you close the browser
- **No Server Storage**: We never see or store your key

## ❓ **Frequently Asked Questions**

### **Q: Why can't you just make it work without the bridge?**
**A:** Web browsers cannot access USB devices directly. This is a security feature that protects users from malicious websites accessing hardware. The bridge is the only way to provide this functionality safely.

### **Q: How do I know the bridge isn't malicious?**
**A:** 
1. **Source code is open** - review every line on GitHub
2. **Monitor network traffic** - use tools like Wireshark to see what it sends
3. **Check system resources** - monitor CPU, memory, and file access
4. **Build from source** - compile it yourself if you don't trust pre-built binaries

### **Q: What if your cloud service gets compromised?**
**A:** 
- **No user data to steal** - we don't store anything
- **Bridge stays secure** - runs locally under your control
- **API keys safe** - never sent to our servers
- **Arduino isolated** - only accessible through your local bridge

### **Q: Can you spy on my Arduino commands?**
**A:** 
- **Technically possible** during WebSocket transmission
- **Not logged or stored** - processed in memory only
- **Encrypted in transit** - protected from network eavesdropping
- **Auditable** - you can verify this by reviewing the source code

### **Q: What happens if you shut down the service?**
**A:** 
- **Bridge continues working** - it's a standalone application
- **Source code remains available** - you can run your own cloud instance
- **No vendor lock-in** - everything is open source

### **Q: How do I verify these claims?**
**A:** 
1. **Review the source code** on GitHub
2. **Monitor network traffic** with browser dev tools
3. **Check bridge behavior** with system monitoring tools
4. **Build from source** to ensure no hidden functionality
5. **Run your own cloud instance** for complete control

## 🔧 **Technical Implementation Details**

### **Bridge Communication Protocol**
```javascript
// Example WebSocket message from cloud to bridge
{
  "type": "arduino_command",
  "id": "uuid-here",
  "command": "LED_ON",
  "params": {}
}

// Example response from bridge to cloud
{
  "type": "command_result",
  "bridgeId": "machine-id",
  "commandId": "uuid-here",
  "result": { "success": true },
  "timestamp": 1234567890
}
```

### **API Key Handling**
```javascript
// API key is stored only in browser memory
const session = {
  apiKey: userProvidedKey,  // Never sent to our servers
  genAI: new GoogleGenerativeAI(userProvidedKey),
  connectedAt: Date.now()
};

// When you close the browser, this is completely cleared
```

### **Data Flow Diagram**
```
User Command → Browser → Cloud AI → Arduino Command → Bridge → Arduino
Arduino Response → Bridge → Cloud → Browser → User Interface
```

## 📞 **Contact & Reporting**

### **Security Concerns**
- **Email**: security@arduino-control.ai
- **GitHub Issues**: https://github.com/luka-loehr/arduino-ai-control/issues
- **Responsible Disclosure**: We welcome security researchers

### **Transparency Requests**
- **GitHub Discussions**: https://github.com/luka-loehr/arduino-ai-control/discussions
- **Documentation Updates**: Submit PRs to improve this document

### **Community Oversight**
- **Code Reviews**: All changes are public on GitHub
- **Issue Tracking**: All bugs and features discussed openly
- **Community Contributions**: Pull requests welcome

---

## 🎯 **Our Promise**

We commit to:
- ✅ **Complete transparency** in all operations
- ✅ **No data collection** beyond what's necessary for functionality
- ✅ **Open source everything** - no hidden components
- ✅ **User control** - you own your data and hardware
- ✅ **Security first** - protect user privacy and security
- ✅ **Community driven** - responsive to user feedback

**If we ever violate these principles, the open source nature of this project means the community can fork it and continue without us.**

---

*Last updated: 2025-01-08*
*Document version: 1.0*
*Source: https://github.com/luka-loehr/arduino-ai-control/blob/main/TRANSPARENCY.md*
