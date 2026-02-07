#!/bin/bash

# ============================================================
# Payment System Test Script
# Tests payment routing and endpoints
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
        echo -e "   ${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "   ${RED}FAIL${NC} - Expected '$expected'"
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
# Test 2-12: All Countries (should route to web)
# ============================================================
echo "--- ALL COUNTRIES (should route to web) ---"
echo ""

COUNTER=2
for COUNTRY in RS AL BA MK ME XK GR HR BG RO SI; do
    echo "$COUNTER. Testing $COUNTRY"
    RESULT=$(curl -s "$API_URL/api/payments/providers/$COUNTRY")
    run_test "$COUNTRY -> web" "web" "$RESULT"
    echo ""
    ((COUNTER++))
done

# ============================================================
# Edge Cases
# ============================================================
echo "--- EDGE CASES ---"
echo ""

echo "$COUNTER. Testing Unknown Country (XX)"
UNKNOWN=$(curl -s "$API_URL/api/payments/providers/XX")
run_test "Unknown -> web" "web" "$UNKNOWN"
echo ""
((COUNTER++))

echo "$COUNTER. Testing Lowercase Country Code (rs)"
LOWERCASE=$(curl -s "$API_URL/api/payments/providers/rs")
run_test "Lowercase rs -> web" "web" "$LOWERCASE"
echo ""
((COUNTER++))

# ============================================================
# Authentication Tests
# ============================================================
echo "--- AUTHENTICATION TESTS ---"
echo ""

echo "$COUNTER. Testing create-payment without auth (should fail)"
CREATE_NO_AUTH=$(curl -s -X POST "$API_URL/api/payments/create-payment" \
  -H "Content-Type: application/json" \
  -d '{"planName":"Pro","planInterval":"month","amount":25,"countryCode":"RS"}')
if echo "$CREATE_NO_AUTH" | grep -qE "(401|unauthorized|Unauthorized|token)"; then
    echo -e "   ${GREEN}PASS${NC} - Correctly requires auth"
    ((PASSED++))
else
    echo -e "   ${RED}FAIL${NC} - Should require authentication"
    ((FAILED++))
fi
echo ""
((COUNTER++))

echo "$COUNTER. Testing subscription-status without auth (should fail)"
STATUS_NO_AUTH=$(curl -s "$API_URL/api/payments/subscription-status")
if echo "$STATUS_NO_AUTH" | grep -qE "(401|unauthorized|Unauthorized|token)"; then
    echo -e "   ${GREEN}PASS${NC} - Correctly requires auth"
    ((PASSED++))
else
    echo -e "   ${RED}FAIL${NC} - Should require authentication"
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
exit $FAILED
