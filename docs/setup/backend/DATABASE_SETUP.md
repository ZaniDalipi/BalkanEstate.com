# Database Setup Guide

This guide will help you set up MongoDB for the Balkan Estate application.

## Option 1: Local MongoDB (Recommended for Development)

### Installation

#### macOS
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
brew services list | grep mongodb
```

#### Ubuntu/Debian Linux
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Check status
sudo systemctl status mongod
```

#### Windows
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer
3. Select "Complete" installation
4. Install MongoDB as a Service (checked by default)
5. MongoDB will start automatically

### Configuration

Your `backend/.env` file is already configured for local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/balkan-estate
```

No changes needed!

### Quick Start

Use the provided script:
```bash
./setup-mongodb.sh
```

This will check if MongoDB is installed and running, and provide instructions if needed.

---

## Option 2: MongoDB Atlas (Cloud Database)

If you prefer not to install MongoDB locally, you can use MongoDB Atlas (free tier available).

### Setup Steps

1. **Create Account**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up for a free account

2. **Create Cluster**
   - Click "Build a Database"
   - Choose "Free" tier (M0)
   - Select a cloud provider and region close to you
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Set username and password (save these!)
   - Set "Database User Privileges" to "Atlas admin"
   - Click "Add User"

4. **Whitelist Your IP Address** ⚠️ **IMPORTANT**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
   - Or click "Add Current IP Address" for better security
   - Click "Confirm"
   - **Wait 1-2 minutes** for changes to take effect

5. **Get Connection String**
   - Go back to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/balkan-estate?retryWrites=true&w=majority`
   - Replace `<password>` with your database user password
   - Replace `test` with `balkan-estate` (or it's already in the string above)

6. **Update Backend Configuration**
   - Open `backend/.env`
   - Update the `MONGODB_URI` line:
   ```
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/balkan-estate?retryWrites=true&w=majority
   ```

### Common Atlas Issues

**Problem: "Could not connect to any servers in your MongoDB Atlas cluster"**
- **Solution**: Your IP is not whitelisted
  1. Go to Network Access in MongoDB Atlas
  2. Click "Add IP Address"
  3. Add your current IP or use 0.0.0.0/0 for all IPs
  4. Wait 1-2 minutes for the change to propagate
  5. Restart your backend

**Problem: "Authentication failed"**
- **Solution**: Check your username/password in the connection string
  - Make sure special characters in the password are URL-encoded
  - Example: `@` becomes `%40`, `#` becomes `%23`

---

## Starting the Application

### Automated Startup (Easy Way)

Run the all-in-one startup script:
```bash
./start-app.sh
```

This will:
1. Check MongoDB is installed and running
2. Install dependencies if needed
3. Start the backend (port 5001)
4. Start the frontend (port 3000)

### Manual Startup

#### Terminal 1 - Backend:
```bash
cd backend
npm install         # First time only
npm run dev        # Starts on port 5001
```

#### Terminal 2 - Frontend:
```bash
npm install         # First time only
npm run dev        # Starts on port 3000
```

---

## Testing the Connection

Use the provided test script:
```bash
./test-backend.sh
```

This will check:
- ✅ Backend is responding
- ✅ MongoDB is connected
- ✅ API endpoints are working

### Manual Testing

1. **Check backend health:**
   ```bash
   curl http://localhost:5001/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test signup endpoint:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123","name":"Test User","phone":"+1234567890"}'
   ```

3. **Open frontend:**
   - Go to http://localhost:3000
   - Try signing up with a new account
   - Create a test property listing

---

## Troubleshooting

### Backend won't start

**Check the logs:**
```bash
cd backend
npm run dev
```

Look for error messages about MongoDB connection.

**Common fixes:**
- Make sure MongoDB is running: `pgrep -x mongod` (should return a number)
- Check `backend/.env` has correct `MONGODB_URI`
- For Atlas: verify IP is whitelisted and credentials are correct

### Frontend can't connect to backend

**Check CORS settings:**
- Backend should allow `http://localhost:3000`
- Check `backend/src/server.ts` CORS configuration

**Verify backend is running:**
```bash
curl http://localhost:5001/health
```

### MongoDB connection errors

**Error: "connect ECONNREFUSED 127.0.0.1:27017"**
- MongoDB is not running locally
- Start it: `brew services start mongodb-community` (macOS) or `sudo systemctl start mongod` (Linux)

**Error: "MongooseServerSelectionError"**
- For local: MongoDB service is not running
- For Atlas: IP not whitelisted or wrong credentials

---

## Quick Reference

**Check if services are running:**
```bash
# MongoDB
pgrep -x mongod

# Backend (port 5001)
lsof -i :5001

# Frontend (port 3000)
lsof -i :3000
```

**Stop services:**
```bash
# Kill backend
pkill -f 'node.*backend'

# Kill frontend
pkill -f 'vite'

# Stop MongoDB (macOS)
brew services stop mongodb-community

# Stop MongoDB (Linux)
sudo systemctl stop mongod
```

**View logs:**
```bash
# If using start-app.sh
tail -f backend.log
tail -f frontend.log
```

---

## Next Steps

Once everything is running:

1. ✅ Open http://localhost:3000
2. ✅ Create a user account (signup)
3. ✅ Create a property listing
4. ✅ Try favoriting properties
5. ✅ Test saved searches
6. ✅ Send messages between users

Your data will now persist in MongoDB! 🎉
