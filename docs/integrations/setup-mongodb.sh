#!/bin/bash

echo "🔧 MongoDB Setup for Balkan Estate"
echo "=================================="
echo ""

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB is NOT installed on your system"
    echo ""
    echo "📥 Installation Instructions:"
    echo ""

    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "For macOS (using Homebrew):"
        echo "  1. Install Homebrew if you haven't: https://brew.sh"
        echo "  2. Run: brew tap mongodb/brew"
        echo "  3. Run: brew install mongodb-community"
        echo "  4. Start MongoDB: brew services start mongodb-community"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "For Ubuntu/Debian:"
        echo "  1. Import MongoDB public key:"
        echo "     wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -"
        echo "  2. Add MongoDB repository:"
        echo "     echo \"deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list"
        echo "  3. Update and install:"
        echo "     sudo apt-get update"
        echo "     sudo apt-get install -y mongodb-org"
        echo "  4. Start MongoDB:"
        echo "     sudo systemctl start mongod"
        echo "     sudo systemctl enable mongod"
    else
        echo "For Windows:"
        echo "  1. Download MongoDB Community Server from:"
        echo "     https://www.mongodb.com/try/download/community"
        echo "  2. Run the installer"
        echo "  3. MongoDB will run as a Windows service automatically"
    fi

    echo ""
    echo "💡 Alternative: Use MongoDB Atlas (Cloud Database)"
    echo "  1. Go to https://www.mongodb.com/cloud/atlas/register"
    echo "  2. Create a free cluster"
    echo "  3. Get your connection string"
    echo "  4. Update backend/.env with: MONGODB_URI=<your-connection-string>"
    echo "  5. Whitelist your IP in Network Access settings"
    echo ""
    exit 1
fi

echo "✅ MongoDB is installed"
echo ""

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is already running"
else
    echo "⚠️  MongoDB is NOT running"
    echo ""
    echo "Starting MongoDB..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start mongod
    else
        echo "Please start MongoDB manually:"
        echo "  - Windows: MongoDB should start automatically as a service"
        echo "  - Or run: mongod --dbpath <your-data-directory>"
    fi

    # Wait a moment for MongoDB to start
    sleep 2
fi

echo ""
echo "🧪 Testing MongoDB connection..."

# Test connection
if mongosh --eval "db.version()" balkan-estate &> /dev/null || mongo --eval "db.version()" balkan-estate &> /dev/null; then
    echo "✅ Successfully connected to MongoDB!"
    echo ""
    echo "📊 MongoDB Info:"
    mongosh --quiet --eval "print('Database: balkan-estate'); print('Version: ' + db.version())" balkan-estate 2>/dev/null || \
    mongo --quiet --eval "print('Database: balkan-estate'); print('Version: ' + db.version())" balkan-estate 2>/dev/null
else
    echo "⚠️  Could not connect to MongoDB"
    echo "   Make sure MongoDB is running on localhost:27017"
fi

echo ""
echo "✅ Setup complete! You can now start the backend:"
echo "   cd backend && npm run dev"
