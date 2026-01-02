#!/bin/bash

# ============================================================
# Staging Payment System E2E Tests
#
# Run comprehensive tests against staging environment
# Usage: ./scripts/test-staging-payments.sh [staging-url] [auth-token]
#
# Example:
#   ./scripts/test-staging-payments.sh https://staging-api.balkanestate.com
# ============================================================

set -e

# Configuration
STAGING_URL="${1:-https://staging-api.balkanestate.com}"
AUTH_TOKEN="${2:-}"
PASSED=0
FAILED=0
SKIPPED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# HELPER FUNCTIONS
# ============================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIPPED++))
}

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected="$4"
    local data="$5"
    local auth="$6"

    local headers=""
    if [ -n "$auth" ]; then
        headers="-H 'Authorization: Bearer $auth'"
    fi

    local response
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$STAGING_URL$endpoint" $headers)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$STAGING_URL$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    fi

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)

    if echo "$body" | grep -q "$expected"; then
        log_success "$name (HTTP $http_code)"
        return 0
    else
        log_fail "$name - Expected '$expected' (HTTP $http_code)"
        echo "  Response: $(echo "$body" | head -c 200)"
        return 1
    fi
}

# ============================================================
# TESTS
# ============================================================

echo ""
echo "========================================"
echo "  Staging Payment System E2E Tests"
echo "  URL: $STAGING_URL"
echo "========================================"
echo ""

# ----------------------------------------------------------
# 1. Health Check
# ----------------------------------------------------------
log_info "Running health checks..."

if curl -s "$STAGING_URL/health" > /dev/null 2>&1; then
    log_success "API is reachable"
else
    log_fail "API is not reachable at $STAGING_URL"
    echo "Please check the staging URL and try again."
    exit 1
fi

echo ""

# ----------------------------------------------------------
# 2. Public Endpoints
# ----------------------------------------------------------
log_info "Testing public endpoints..."

test_endpoint \
    "GET /api/payments/supported-countries" \
    "GET" \
    "/api/payments/supported-countries" \
    "success"

test_endpoint \
    "GET /api/payments/paddle/config" \
    "GET" \
    "/api/payments/paddle/config" \
    "success"

echo ""

# ----------------------------------------------------------
# 3. Country Routing Tests
# ----------------------------------------------------------
log_info "Testing country routing..."

# EU Countries -> Stripe
for country in GR HR BG RO SI; do
    test_endpoint \
        "Country $country -> Stripe" \
        "GET" \
        "/api/payments/providers/$country" \
        "stripe"
done

echo ""

# Non-EU Countries -> Paddle
for country in RS AL BA MK ME XK; do
    test_endpoint \
        "Country $country -> Paddle" \
        "GET" \
        "/api/payments/providers/$country" \
        "paddle"
done

echo ""

# ----------------------------------------------------------
# 4. Edge Cases
# ----------------------------------------------------------
log_info "Testing edge cases..."

test_endpoint \
    "Unknown country (XX) -> Stripe default" \
    "GET" \
    "/api/payments/providers/XX" \
    "stripe"

test_endpoint \
    "Lowercase country (rs) -> Paddle" \
    "GET" \
    "/api/payments/providers/rs" \
    "paddle"

echo ""

# ----------------------------------------------------------
# 5. Authentication Required Endpoints
# ----------------------------------------------------------
log_info "Testing authentication requirements..."

# These should return 401
response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$STAGING_URL/api/payments/create-payment" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"planName":"Test"}')

if [ "$response" = "401" ]; then
    log_success "POST /api/payments/create-payment requires auth (401)"
else
    log_fail "POST /api/payments/create-payment should require auth"
fi

response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$STAGING_URL/api/payments/subscription-status")

if [ "$response" = "401" ]; then
    log_success "GET /api/payments/subscription-status requires auth (401)"
else
    log_fail "GET /api/payments/subscription-status should require auth"
fi

echo ""

# ----------------------------------------------------------
# 6. Authenticated Tests (if token provided)
# ----------------------------------------------------------
if [ -n "$AUTH_TOKEN" ]; then
    log_info "Testing authenticated endpoints..."

    # Get subscription status
    test_endpoint \
        "GET /api/payments/subscription-status (authenticated)" \
        "GET" \
        "/api/payments/subscription-status" \
        "isSubscribed" \
        "" \
        "$AUTH_TOKEN"

    # Create payment for EU country
    test_endpoint \
        "POST /api/payments/create-payment (Greece/Stripe)" \
        "POST" \
        "/api/payments/create-payment" \
        "provider" \
        '{"planName":"Pro Monthly","planInterval":"month","amount":25,"countryCode":"GR","productId":"pro_monthly"}' \
        "$AUTH_TOKEN"

    # Create payment for non-EU country
    test_endpoint \
        "POST /api/payments/create-payment (Serbia/Paddle)" \
        "POST" \
        "/api/payments/create-payment" \
        "provider" \
        '{"planName":"Pro Monthly","planInterval":"month","amount":25,"countryCode":"RS","productId":"pro_monthly"}' \
        "$AUTH_TOKEN"

else
    log_skip "Authenticated tests (no token provided)"
    log_info "To run authenticated tests, provide a token:"
    log_info "  ./scripts/test-staging-payments.sh $STAGING_URL YOUR_AUTH_TOKEN"
fi

echo ""

# ----------------------------------------------------------
# 7. Webhook Endpoints
# ----------------------------------------------------------
log_info "Testing webhook endpoints..."

# Paddle webhook should accept POST
response=$(curl -s -w "\n%{http_code}" \
    -X POST "$STAGING_URL/api/payments/paddle/webhook" \
    -H "Content-Type: application/json" \
    -d '{"event_type":"test","event_id":"evt_test"}')

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ]; then
    log_success "POST /api/payments/paddle/webhook accepts webhooks (200)"
else
    log_fail "POST /api/payments/paddle/webhook failed (HTTP $http_code)"
fi

echo ""

# ============================================================
# SUMMARY
# ============================================================

echo "========================================"
echo "  Test Results"
echo "========================================"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASSED"
echo -e "  ${RED}Failed:${NC}  $FAILED"
echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
echo "  Total:   $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check the output above.${NC}"
    exit 1
fi
