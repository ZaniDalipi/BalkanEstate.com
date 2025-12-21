#!/bin/bash

echo "🔍 Testing Backend API Connection..."
echo ""

# Test 1: Check if backend is running
echo "1. Testing backend health endpoint..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "   ✅ Backend is responding"
    curl -s http://localhost:5001/health | python3 -m json.tool
else
    echo "   ❌ Backend is NOT responding on port 5001"
    echo "   👉 Start the backend: cd Backend && npm run dev"
fi

echo ""

# Test 2: Check if MongoDB is running
echo "2. Testing MongoDB connection..."
if pgrep -x "mongod" > /dev/null; then
    echo "   ✅ MongoDB is running"
else
    echo "   ❌ MongoDB is NOT running"
    echo "   👉 Start MongoDB: brew services start mongodb-community"
fi

echo ""

# Test 3: Test signup endpoint
echo "3. Testing signup endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","name":"Test User","phone":"+1234567890"}' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 400 ]; then
    echo "   ✅ API endpoint is working (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" -eq 000 ]; then
    echo "   ❌ Cannot connect to backend"
    echo "   👉 Make sure backend is running on port 5001"
else
    echo "   ⚠️  Unexpected response (HTTP $HTTP_CODE)"
    echo "$BODY"
fi

echo ""
echo "📊 Summary:"
lsof -i :5001 > /dev/null 2>&1 && echo "✅ Port 5001 is in use" || echo "❌ Port 5001 is NOT in use"
lsof -i :3000 > /dev/null 2>&1 && echo "✅ Port 3000 is in use" || echo "❌ Port 3000 is NOT in use"
