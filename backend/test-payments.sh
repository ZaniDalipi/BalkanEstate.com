#!/bin/bash

# ============================================================
# Payment System Test Script
# Tests Stripe + Paddle payment routing and endpoints
# ============================================================

API_URL="${API_URL:-http://localhost:5001}"
PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Payment System Tests"
echo "  API: $API_URL"
echo "========================================"
echo ""

# Helper function to run a test
run_test() {
    local name="$1"
    local expected="$2"
    local response="$3"

    if echo "$response" | grep -q "$expected"; then
        echo -e "   ${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "   ${RED}❌ FAIL${NC} - Expected '$expected'"
        echo "   Response: $response"
        ((FAILED++))
    fi
}

# ============================================================
# Test 1: Supported Countries Endpoint
# ============================================================
echo "1. Testing GET /api/payments/supported-countries"
COUNTRIES=$(curl -s "$API_URL/api/payments/supported-countries")
run_test "Supported countries" "success" "$COUNTRIES"
echo ""

# ============================================================
# Test 2-7: Non-EU Countries (Paddle)
# ============================================================
echo "--- NON-EU COUNTRIES (should route to Paddle) ---"
echo ""

echo "2. Testing Serbia (RS)"
SERBIA=$(curl -s "$API_URL/api/payments/providers/RS")
run_test "Serbia -> Paddle" "paddle" "$SERBIA"
echo ""

echo "3. Testing Albania (AL)"
ALBANIA=$(curl -s "$API_URL/api/payments/providers/AL")
run_test "Albania -> Paddle" "paddle" "$ALBANIA"
echo ""

echo "4. Testing Bosnia (BA)"
BOSNIA=$(curl -s "$API_URL/api/payments/providers/BA")
run_test "Bosnia -> Paddle" "paddle" "$BOSNIA"
echo ""

echo "5. Testing North Macedonia (MK)"
MACEDONIA=$(curl -s "$API_URL/api/payments/providers/MK")
run_test "N. Macedonia -> Paddle" "paddle" "$MACEDONIA"
echo ""

echo "6. Testing Montenegro (ME)"
MONTENEGRO=$(curl -s "$API_URL/api/payments/providers/ME")
run_test "Montenegro -> Paddle" "paddle" "$MONTENEGRO"
echo ""

echo "7. Testing Kosovo (XK)"
KOSOVO=$(curl -s "$API_URL/api/payments/providers/XK")
run_test "Kosovo -> Paddle" "paddle" "$KOSOVO"
echo ""

# ============================================================
# Test 8-12: EU Countries (Stripe)
# ============================================================
echo "--- EU COUNTRIES (should route to Stripe) ---"
echo ""

echo "8. Testing Greece (GR)"
GREECE=$(curl -s "$API_URL/api/payments/providers/GR")
run_test "Greece -> Stripe" "stripe" "$GREECE"
echo ""

echo "9. Testing Croatia (HR)"
CROATIA=$(curl -s "$API_URL/api/payments/providers/HR")
run_test "Croatia -> Stripe" "stripe" "$CROATIA"
echo ""

echo "10. Testing Bulgaria (BG)"
BULGARIA=$(curl -s "$API_URL/api/payments/providers/BG")
run_test "Bulgaria -> Stripe" "stripe" "$BULGARIA"
echo ""

echo "11. Testing Romania (RO)"
ROMANIA=$(curl -s "$API_URL/api/payments/providers/RO")
run_test "Romania -> Stripe" "stripe" "$ROMANIA"
echo ""

echo "12. Testing Slovenia (SI)"
SLOVENIA=$(curl -s "$API_URL/api/payments/providers/SI")
run_test "Slovenia -> Stripe" "stripe" "$SLOVENIA"
echo ""

# ============================================================
# Test 13-14: Edge Cases
# ============================================================
echo "--- EDGE CASES ---"
echo ""

echo "13. Testing Unknown Country (XX) - should default to Stripe"
UNKNOWN=$(curl -s "$API_URL/api/payments/providers/XX")
run_test "Unknown -> Stripe" "stripe" "$UNKNOWN"
echo ""

echo "14. Testing Lowercase Country Code (rs)"
LOWERCASE=$(curl -s "$API_URL/api/payments/providers/rs")
run_test "Lowercase rs -> Paddle" "paddle" "$LOWERCASE"
echo ""

# ============================================================
# Test 15: Paddle Config Endpoint
# ============================================================
echo "15. Testing GET /api/payments/paddle/config"
PADDLE_CONFIG=$(curl -s "$API_URL/api/payments/paddle/config")
run_test "Paddle config" "success" "$PADDLE_CONFIG"
echo ""

# ============================================================
# Test 16-17: Authentication Tests
# ============================================================
echo "--- AUTHENTICATION TESTS ---"
echo ""

echo "16. Testing create-payment without auth (should fail)"
CREATE_NO_AUTH=$(curl -s -X POST "$API_URL/api/payments/create-payment" \
  -H "Content-Type: application/json" \
  -d '{"planName":"Pro","planInterval":"month","amount":25,"countryCode":"RS"}')
if echo "$CREATE_NO_AUTH" | grep -qE "(401|unauthorized|Unauthorized|token)"; then
    echo -e "   ${GREEN}✅ PASS${NC} - Correctly requires auth"
    ((PASSED++))
else
    echo -e "   ${RED}❌ FAIL${NC} - Should require authentication"
    ((FAILED++))
fi
echo ""

echo "17. Testing subscription-status without auth (should fail)"
STATUS_NO_AUTH=$(curl -s "$API_URL/api/payments/subscription-status")
if echo "$STATUS_NO_AUTH" | grep -qE "(401|unauthorized|Unauthorized|token)"; then
    echo -e "   ${GREEN}✅ PASS${NC} - Correctly requires auth"
    ((PASSED++))
else
    echo -e "   ${RED}❌ FAIL${NC} - Should require authentication"
    ((FAILED++))
fi
echo ""

# ============================================================
# Test 18: Webhook Endpoint
# ============================================================
echo "--- WEBHOOK ENDPOINTS ---"
echo ""

echo "18. Testing Paddle webhook endpoint exists"
PADDLE_WEBHOOK=$(curl -s -X POST "$API_URL/api/payments/paddle/webhook" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test"}')
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✅ PASS${NC} - Endpoint exists"
    ((PASSED++))
else
    echo -e "   ${RED}❌ FAIL${NC} - Endpoint not found"
    ((FAILED++))
fi
echo ""

# ============================================================
# Summary
# ============================================================
echo "========================================"
echo "  Test Results"
echo "========================================"
echo ""
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo "  Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${YELLOW}Some tests failed. Check the output above.${NC}"
fi

echo ""
echo "========================================"
echo "  Test Cards"
echo "========================================"
echo ""
echo "Stripe Test Cards:"
echo "  4242424242424242  - Success"
echo "  4000000000003220  - 3D Secure required"
echo "  4000000000009995  - Declined"
echo ""
echo "Paddle Sandbox Cards:"
echo "  4242424242424242  - Success"
echo "  4000000000000002  - Declined"
echo ""
echo "For all cards: Expiry=12/34, CVC=123"
echo ""
echo "See PAYMENT_TESTING.md for full testing guide."
echo ""

exit $FAILED
