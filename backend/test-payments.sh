#!/bin/bash
# Payment Framework Test Script
# Run this to test the payment endpoints

API_URL="${API_URL:-http://localhost:5001}"

echo "========================================"
echo "  Payment Framework Test Suite"
echo "========================================"
echo ""

# Test 1: Get supported countries (public endpoint)
echo "1. Testing GET /api/payments/supported-countries..."
COUNTRIES=$(curl -s "$API_URL/api/payments/supported-countries")
if echo "$COUNTRIES" | grep -q "success"; then
    echo "   ✅ Supported countries endpoint works!"
    echo "   Response: $(echo "$COUNTRIES" | head -c 200)..."
else
    echo "   ❌ Failed to get supported countries"
    echo "   Response: $COUNTRIES"
fi
echo ""

# Test 2: Get provider for Serbia (non-EU - should return PaySera)
echo "2. Testing GET /api/payments/providers/RS (Serbia)..."
SERBIA=$(curl -s "$API_URL/api/payments/providers/RS")
if echo "$SERBIA" | grep -q "paysera"; then
    echo "   ✅ Serbia correctly routes to PaySera!"
else
    echo "   ❌ Serbia routing failed"
    echo "   Response: $SERBIA"
fi
echo ""

# Test 3: Get provider for Greece (EU - should return Stripe)
echo "3. Testing GET /api/payments/providers/GR (Greece)..."
GREECE=$(curl -s "$API_URL/api/payments/providers/GR")
if echo "$GREECE" | grep -q "stripe"; then
    echo "   ✅ Greece correctly routes to Stripe!"
else
    echo "   ❌ Greece routing failed"
    echo "   Response: $GREECE"
fi
echo ""

# Test 4: Get provider for Albania (non-EU - should return PaySera)
echo "4. Testing GET /api/payments/providers/AL (Albania)..."
ALBANIA=$(curl -s "$API_URL/api/payments/providers/AL")
if echo "$ALBANIA" | grep -q "paysera"; then
    echo "   ✅ Albania correctly routes to PaySera!"
else
    echo "   ❌ Albania routing failed"
    echo "   Response: $ALBANIA"
fi
echo ""

# Test 5: Get provider for Croatia (EU - should return Stripe)
echo "5. Testing GET /api/payments/providers/HR (Croatia)..."
CROATIA=$(curl -s "$API_URL/api/payments/providers/HR")
if echo "$CROATIA" | grep -q "stripe"; then
    echo "   ✅ Croatia correctly routes to Stripe!"
else
    echo "   ❌ Croatia routing failed"
    echo "   Response: $CROATIA"
fi
echo ""

echo "========================================"
echo "  Summary"
echo "========================================"
echo ""
echo "To test authenticated endpoints (create-payment, etc.):"
echo "1. Start the server: cd backend && npm run dev"
echo "2. Login and get a token"
echo "3. Use the token to test:"
echo ""
echo "   # Create payment for Serbia (PaySera)"
echo "   curl -X POST $API_URL/api/payments/create-payment \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"planName\":\"Pro Monthly\",\"planInterval\":\"month\",\"amount\":25,\"countryCode\":\"RS\"}'"
echo ""
echo "   # Create payment for Greece (Stripe)"
echo "   curl -X POST $API_URL/api/payments/create-payment \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -d '{\"planName\":\"Pro Monthly\",\"planInterval\":\"month\",\"amount\":25,\"countryCode\":\"GR\"}'"
echo ""
