#!/bin/bash

echo "🔍 Checking Backend Status"
echo "=========================="
echo ""

# Check if port 5001 is in use
if lsof -i :5001 > /dev/null 2>&1; then
    echo "✅ Port 5001 is in use"
    echo ""
    echo "Process details:"
    lsof -i :5001
    echo ""
else
    echo "❌ Port 5001 is NOT in use - backend is not running!"
    echo ""
    echo "Start the backend with:"
    echo "  cd backend && npm run dev"
    exit 1
fi

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5001/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health endpoint working! Response:"
    echo "$BODY"
else
    echo "❌ Health endpoint returned HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi

echo ""

# Test OPTIONS request (preflight)
echo "Testing CORS preflight (OPTIONS request)..."
OPTIONS_RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS http://localhost:5001/api/properties \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" 2>&1)

OPTIONS_CODE=$(echo "$OPTIONS_RESPONSE" | tail -n1)

if [ "$OPTIONS_CODE" = "204" ] || [ "$OPTIONS_CODE" = "200" ]; then
    echo "✅ OPTIONS request working! HTTP $OPTIONS_CODE"
else
    echo "❌ OPTIONS request failed! HTTP $OPTIONS_CODE"
    echo "This is why you're getting CORS errors!"
fi

echo ""
echo "Full OPTIONS response headers:"
curl -v -X OPTIONS http://localhost:5001/api/properties \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" 2>&1 | grep -E "^< |^> "
