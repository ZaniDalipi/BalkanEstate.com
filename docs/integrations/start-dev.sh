#!/bin/bash

# Balkan Estate Development Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting Balkan Estate Development Environment"
echo "================================================"
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running!"
    echo "   Please start MongoDB first:"
    echo "   - macOS: brew services start mongodb-community"
    echo "   - Linux: sudo systemctl start mongod"
    echo "   - Or run: mongod"
    echo ""
    read -p "Press Enter when MongoDB is running..."
fi

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found!"
    echo "   Copying from .env.example..."
    cp backend/.env.example backend/.env
    echo "   ✅ Created backend/.env"
    echo "   ⚠️  Please edit backend/.env with your MongoDB URI and Cloudinary credentials"
    echo ""
fi

# Check if frontend .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Frontend .env file not found!"
    echo "   Copying from .env.example..."
    cp .env.example .env
    echo "   ✅ Created .env"
    echo ""
fi

echo "Starting servers..."
echo ""

# Start backend in background
echo "📦 Starting Backend API (http://localhost:5001)..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting Frontend (http://localhost:3000)..."
echo ""
echo "================================================"
echo "✅ Development environment is starting!"
echo ""
echo "Backend:  http://localhost:5001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Backend logs: tail -f backend.log"
echo "Backend PID: $BACKEND_PID"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "================================================"
echo ""

# Start frontend (runs in foreground)
npm run dev

# When frontend exits, kill backend
echo ""
echo "Stopping backend..."
kill $BACKEND_PID 2>/dev/null
echo "✅ Servers stopped"
