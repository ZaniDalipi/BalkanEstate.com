# 🚀 Quick Start Guide

## Critical Fixes Applied

I've just fixed the CORS 403 error! Here's what changed:

1. **Simplified CORS** - Now allows all origins in development (`origin: true`)
2. **Database handling** - Server won't crash if MongoDB isn't running
3. **Debug logging** - You'll see all incoming requests in the console
4. **Better error messages** - Clear guidance when things go wrong

## Steps to Get Running

### 1. Install MongoDB

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Linux:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Windows:**
- Download from https://www.mongodb.com/try/download/community
- Run installer and select "Complete" installation
- MongoDB will start automatically as a service

**Or use the setup script:**
```bash
./setup-mongodb.sh
```

### 2. Start the Backend

Open a terminal and run:

```bash
cd backend

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

You should see:
```
Server running in development mode on port 5001
MongoDB connected successfully
```

If you see the MongoDB error but the server keeps running, that's okay! The CORS will still work. Just start MongoDB in another terminal.

### 3. Start the Frontend

Open a NEW terminal (keep backend running) and run:

```bash
# From the project root
npm install  # First time only
npm run dev
```

The frontend should open at **http://localhost:3000**

### 4. Test It!

1. Open http://localhost:3000 in your browser
2. Click "Sign Up"
3. Create an account
4. If it works - no more CORS errors! 🎉

## Troubleshooting

### Still getting 403 errors?

**1. Make sure you pulled the latest changes:**
```bash
git pull origin claude/integrate-backend-listings-011CV4djv2SJstWUEFh9b8Wo
```

**2. Stop the backend (Ctrl+C) and restart it:**
```bash
cd backend
npm run dev
```

**3. Clear your browser cache:**
- Chrome/Edge: Ctrl+Shift+Delete → "Cached images and files" → Clear
- Firefox: Ctrl+Shift+Delete → "Cache" → Clear Now
- Safari: Cmd+Option+E

**4. Try in Incognito/Private mode** to rule out cache issues

### Backend won't start?

Check if something is already running on port 5001:
```bash
# macOS/Linux
lsof -i :5001

# Windows
netstat -ano | findstr :5001
```

Kill the process if needed:
```bash
# macOS/Linux - use the PID from lsof
kill -9 <PID>

# Windows - use the PID from netstat
taskkill /PID <PID> /F
```

### MongoDB won't connect?

**Check if MongoDB is running:**
```bash
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongod

# All platforms - check if process exists
pgrep -x mongod
```

**Start MongoDB:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows - it should start automatically, or:
net start MongoDB
```

### Frontend can't reach backend?

**Test the backend directly:**
```bash
curl http://localhost:5001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

If that works, the backend is fine. The issue is in the frontend or browser cache.

## Check the Debug Logs

The backend now logs every request. You should see this in the backend terminal:

```
OPTIONS /api/auth/signup - Origin: http://localhost:3000
POST /api/auth/signup - Origin: http://localhost:3000
```

If you don't see the OPTIONS request, it means the request isn't reaching the backend.

## What's Different Now?

### Before (wasn't working):
- CORS was checking specific origins with a callback function
- Server would crash if MongoDB wasn't connected
- Hard to debug what was happening

### After (should work):
- CORS allows ALL origins with `origin: true`
- Server stays running even without MongoDB
- Every request is logged so you can see what's happening
- Clear error messages guide you to fixes

## Quick Test Script

Run this to test the full stack:

```bash
./verify-integration.sh
```

This will check:
- ✅ Backend health
- ✅ MongoDB connection
- ✅ Authentication endpoints
- ✅ Property creation
- ✅ Favorites
- ✅ Saved searches

## Need More Help?

Check these files:
- `DATABASE_SETUP.md` - Complete MongoDB setup guide
- `test-backend.sh` - Test backend connectivity
- `start-app.sh` - Automated startup (starts everything)

## Success Checklist

- [ ] MongoDB is installed and running
- [ ] Backend starts without errors (port 5001)
- [ ] Frontend starts without errors (port 3000)
- [ ] Can access http://localhost:3000 in browser
- [ ] No CORS errors in browser console
- [ ] Can sign up for an account
- [ ] Can create a property listing

Once all these work, you're ready to go! 🚀
