# 🚀 Arduino AI Control - Deployment Guide

## 📋 **Pre-Deployment Checklist**

### ✅ **Repository Ready**
- [x] Cloud interface in `cloud-interface/` directory
- [x] Arduino bridge in `arduino-bridge/` directory  
- [x] Root-level `render.yaml` configuration
- [x] Proper `package.json` with all dependencies
- [x] Health check endpoint at `/health`
- [x] Static files served from `public/` directory

### ✅ **Configuration Files**
- [x] `render.yaml` - Render deployment configuration
- [x] `package.json` - Node.js dependencies and scripts
- [x] `.gitignore` - Excludes unnecessary files
- [x] Environment variables configured for production

### ✅ **Code Quality**
- [x] No syntax errors or linting issues
- [x] All dependencies properly declared
- [x] Error handling and graceful shutdown
- [x] Security headers and CORS configured

---

## 🌐 **Render.com Deployment Steps**

### **Step 1: Connect Repository**
1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select the `arduino-ai-control` repository
5. Render will automatically detect the `render.yaml` file

### **Step 2: Configure Service**
Render will auto-configure from `render.yaml`, but verify these settings:

- **Name**: `arduino-ai-cloud`
- **Environment**: `Node`
- **Build Command**: `cd cloud-interface && npm install`
- **Start Command**: `cd cloud-interface && npm start`
- **Plan**: `Free` (sufficient for initial deployment)

### **Step 3: Environment Variables**
No environment variables are required! The system is designed to work without any secrets:
- ✅ No Google API key needed (users provide their own)
- ✅ No database connections
- ✅ No external service credentials

### **Step 4: Deploy**
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Monitor the build logs for any issues
4. Once deployed, you'll get a URL like: `https://arduino-ai-cloud.onrender.com`

### **Step 5: Test Deployment**
1. Visit your deployed URL
2. Check that the web interface loads correctly
3. Verify the health endpoint: `https://your-url.onrender.com/health`
4. Test bridge detection (will show "no bridges" until someone runs the bridge)

---

## 🔧 **Post-Deployment Configuration**

### **Custom Domain (Optional)**
1. In Render dashboard → Settings → Custom Domains
2. Add your domain (e.g., `arduino-control.ai`)
3. Configure DNS records as instructed by Render
4. Enable automatic HTTPS (included free)

### **Monitoring & Logs**
- **Logs**: Available in Render dashboard → Logs tab
- **Metrics**: Basic metrics available in Render dashboard
- **Health Check**: Automatic monitoring of `/health` endpoint
- **Uptime**: Render provides 99.9% uptime on paid plans

### **Scaling (If Needed)**
- **Free Plan**: 512MB RAM, shared CPU (sufficient for most use)
- **Starter Plan**: $7/month, 512MB RAM, dedicated CPU
- **Standard Plan**: $25/month, 2GB RAM, dedicated CPU

---

## 🔍 **Verification Steps**

### **1. Health Check**
```bash
curl https://your-deployed-url.onrender.com/health
```
Expected response:
```json
{
  "status": "ok",
  "bridges": 0,
  "users": 0,
  "uptime": 123,
  "timestamp": "2025-01-08T..."
}
```

### **2. API Info**
```bash
curl https://your-deployed-url.onrender.com/api/info
```
Expected response:
```json
{
  "name": "Arduino AI Control Cloud",
  "version": "1.0.0",
  "description": "Cloud interface for Arduino AI control with local bridge support",
  "transparency": {
    "sourceCode": "https://github.com/luka-loehr/arduino-ai-control",
    "privacy": "No user data collection or storage",
    "security": "All communication encrypted, API keys stored in memory only"
  },
  "bridges": {
    "connected": 0,
    "downloadUrl": "https://github.com/luka-loehr/arduino-ai-control/releases"
  }
}
```

### **3. Web Interface**
- Visit your deployed URL
- Verify the web interface loads correctly
- Check that bridge detection shows "scanning" message
- Verify transparency links work correctly

### **4. WebSocket Connection**
- Open browser dev tools → Network tab
- Verify WebSocket connection establishes successfully
- Check for welcome message in WebSocket frames

---

## 🛠️ **Troubleshooting**

### **Build Failures**
```bash
# Common issues and solutions:

# 1. Node version mismatch
# Solution: Ensure package.json specifies "node": ">=18.0.0"

# 2. Missing dependencies
# Solution: Run npm install locally and commit package-lock.json

# 3. Path issues
# Solution: Verify build command uses correct path: cd cloud-interface && npm install
```

### **Runtime Errors**
```bash
# Check logs in Render dashboard

# Common issues:
# 1. Port binding - Render provides PORT environment variable
# 2. WebSocket issues - Ensure ws library is properly configured
# 3. CORS errors - Verify cors middleware is configured
```

### **Performance Issues**
```bash
# Free plan limitations:
# - 512MB RAM
# - Shared CPU
# - Sleeps after 15 minutes of inactivity

# Solutions:
# 1. Upgrade to paid plan for dedicated resources
# 2. Implement keep-alive ping to prevent sleeping
# 3. Optimize memory usage
```

---

## 📊 **Expected Resource Usage**

### **Memory Usage**
- **Base application**: ~50-100MB
- **Per WebSocket connection**: ~1-2MB
- **Per bridge connection**: ~2-5MB
- **Total for 100 concurrent users**: ~200-300MB

### **CPU Usage**
- **Idle**: <1% CPU
- **Per AI request**: 5-10% CPU for 1-2 seconds
- **WebSocket handling**: Minimal CPU usage

### **Network Usage**
- **Per command**: ~1-5KB
- **WebSocket overhead**: ~100 bytes per heartbeat
- **Static files**: Served once per session

---

## 🔐 **Security Considerations**

### **What's Secure by Design**
- ✅ No user data storage
- ✅ No API key handling on server
- ✅ HTTPS/WSS encryption
- ✅ CORS protection
- ✅ Security headers (helmet.js)

### **Monitoring Recommendations**
- Monitor unusual traffic patterns
- Watch for WebSocket connection spikes
- Check for error rate increases
- Monitor memory usage trends

---

## 🎯 **Success Criteria**

Your deployment is successful when:
- ✅ Health endpoint returns 200 OK
- ✅ Web interface loads without errors
- ✅ WebSocket connections establish successfully
- ✅ Bridge detection works (shows scanning message)
- ✅ Transparency links are accessible
- ✅ No console errors in browser dev tools

---

## 📞 **Support**

If you encounter issues during deployment:
1. Check Render build/runtime logs
2. Verify all files are committed to GitHub
3. Test locally with `cd cloud-interface && npm start`
4. Create GitHub issue with deployment logs

---

**🎉 Ready to deploy! Your Arduino AI Control cloud interface will be live and ready for users to connect their local bridges.**
