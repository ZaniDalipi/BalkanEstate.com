#!/bin/bash

echo "🚀 Balkan Estate - Application Startup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Step 1: Check MongoDB
echo "1️⃣  Checking MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}❌ MongoDB is not installed${NC}"
    echo "   Run ./setup-mongodb.sh for installation instructions"
    exit 1
fi

if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is not running. Starting it...${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start mongod
    else
        echo "Please start MongoDB manually"
        exit 1
    fi

    sleep 2

    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✅ MongoDB started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start MongoDB${NC}"
        exit 1
    fi
fi

echo ""

# Step 2: Check backend dependencies
echo "2️⃣  Checking backend setup..."
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi
echo -e "${GREEN}✅ Backend dependencies ready${NC}"

echo ""

# Step 3: Check frontend dependencies
echo "3️⃣  Checking frontend setup..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}✅ Frontend dependencies ready${NC}"

echo ""

# Step 4: Start backend
echo "4️⃣  Starting backend server..."
if check_port 5001; then
    echo -e "${YELLOW}⚠️  Port 5001 is already in use${NC}"
    echo "   Backend might already be running"
else
    echo "   Starting backend on port 5001..."
    cd backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..

    # Wait for backend to start
    echo -n "   Waiting for backend"
    for i in {1..10}; do
        if curl -s http://localhost:5001/health > /dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✅ Backend is running on http://localhost:5001${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo ""
        echo -e "${RED}❌ Backend failed to start${NC}"
        echo "   Check backend.log for errors"
        exit 1
    fi
fi

echo ""

# Step 5: Start frontend
echo "5️⃣  Starting frontend..."
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    echo "   Frontend might already be running"
else
    echo "   Starting frontend on port 3000..."
    npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!

    echo -e "${GREEN}✅ Frontend starting on http://localhost:3000${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Application is running!${NC}"
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:5001"
echo "💾 Database:  mongodb://localhost:27017/balkan-estate"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "To stop the application:"
echo "   pkill -f 'node.*backend'"
echo "   pkill -f 'vite'"
echo ""
