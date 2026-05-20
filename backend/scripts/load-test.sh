#!/usr/bin/env bash
# =============================================================================
# API Load / Spam Test Script
# Tests rate limiting on your own local dev server.
# Usage: bash scripts/load-test.sh [BASE_URL]
# Default URL: http://localhost:5000
# =============================================================================

BASE_URL="${1:-http://localhost:5000}"
PASS=0
FAIL=0
RESULTS=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[TEST]${NC} $1"; }
ok()   { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# ---------------------------------------------------------------------------
# Helper: fire N requests at an endpoint, return count of 429 responses
# ---------------------------------------------------------------------------
spam() {
  local method="$1"
  local path="$2"
  local n="$3"
  local body="$4"
  local extra_headers="$5"
  local count_429=0

  for i in $(seq 1 "$n"); do
    args=(-s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path")
    [[ -n "$body" ]]         && args+=(-H "Content-Type: application/json" -d "$body")
    [[ -n "$extra_headers" ]] && args+=(-H "$extra_headers")
    code=$(curl "${args[@]}")
    [[ "$code" == "429" ]] && ((count_429++))
    printf "\r  request %d/%d — last status: %s   " "$i" "$n" "$code"
  done
  echo ""
  echo "$count_429"
}

# ---------------------------------------------------------------------------
check_server() {
  log "Checking server is up at $BASE_URL ..."
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/properties")
  if [[ "$code" == "000" ]]; then
    echo -e "${RED}Server not reachable at $BASE_URL. Start it first.${NC}"
    exit 1
  fi
  log "Server responded with HTTP $code — starting tests."
  echo ""
}

# ---------------------------------------------------------------------------
# TEST 1: General rate limit (1000 req / 15 min)
# Sends 1100 GET requests to a public endpoint.
# Expect: 429 responses after ~1000 hits.
# ---------------------------------------------------------------------------
test_general_rate_limit() {
  log "TEST 1 — General rate limit (GET /api/properties × 1100)"
  warn "Limit is 1000/15min. Sending 1100 requests..."
  blocked=$(spam "GET" "/api/properties" 1100 "" "")
  if [[ "$blocked" -gt 0 ]]; then
    ok "Rate limiter triggered — got $blocked × 429 responses."
  else
    fail "Rate limiter did NOT trigger after 1100 requests. No 429 seen."
  fi
  RESULTS+=("General rate limit: $( [[ $blocked -gt 0 ]] && echo PASS || echo FAIL ) ($blocked × 429)")
  echo ""
}

# ---------------------------------------------------------------------------
# TEST 2: Auth brute force (sensitive limiter — 100 req / 15 min)
# Sends 120 POST /api/auth/login requests with wrong credentials.
# Expect: 429 after ~100 attempts.
# ---------------------------------------------------------------------------
test_auth_brute_force() {
  log "TEST 2 — Auth brute force (POST /api/auth/login × 120)"
  warn "Limit is 100/15min. Sending 120 requests..."
  body='{"email":"victim@test.com","password":"wrongpassword123"}'
  blocked=$(spam "POST" "/api/auth/login" 120 "$body" "")
  if [[ "$blocked" -gt 0 ]]; then
    ok "Auth rate limiter triggered — got $blocked × 429 responses."
  else
    fail "Auth rate limiter did NOT trigger after 120 login attempts."
  fi
  RESULTS+=("Auth brute force: $( [[ $blocked -gt 0 ]] && echo PASS || echo FAIL ) ($blocked × 429)")
  echo ""
}

# ---------------------------------------------------------------------------
# TEST 3: Inquiry spam (POST /api/inquiries/contact)
# No dedicated tight limit beyond general — sends 60 requests.
# ---------------------------------------------------------------------------
test_inquiry_spam() {
  log "TEST 3 — Inquiry spam (POST /api/inquiries/contact × 60)"
  body='{"name":"Spammer","email":"spam@spam.com","message":"Buy my crypto"}'
  blocked=$(spam "POST" "/api/inquiries/contact" 60 "$body" "")
  if [[ "$blocked" -gt 0 ]]; then
    ok "Inquiry endpoint blocked — got $blocked × 429 responses."
  else
    fail "Inquiry endpoint NOT blocked after 60 spam submissions."
  fi
  RESULTS+=("Inquiry spam: $( [[ $blocked -gt 0 ]] && echo PASS || echo FAIL ) ($blocked × 429)")
  echo ""
}

# ---------------------------------------------------------------------------
# TEST 4: X-Forwarded-For IP spoofing bypass
# Rotates the X-Forwarded-For header to fake a different IP each request.
# If rate limiting is bypassable, you will NEVER see a 429.
# ---------------------------------------------------------------------------
test_ip_spoof_bypass() {
  log "TEST 4 — X-Forwarded-For IP spoof bypass (GET /api/properties × 200)"
  warn "Rotating X-Forwarded-For header to fake 200 different IPs..."
  local count_429=0
  for i in $(seq 1 200); do
    fake_ip="10.0.$((i / 255)).$((i % 255))"
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "X-Forwarded-For: $fake_ip" \
      "$BASE_URL/api/properties")
    [[ "$code" == "429" ]] && ((count_429++))
    printf "\r  request %d/200 — fake IP: %s — status: %s   " "$i" "$fake_ip" "$code"
  done
  echo ""
  if [[ "$count_429" -gt 0 ]]; then
    ok "Rate limiter NOT bypassable via X-Forwarded-For spoofing ($count_429 × 429 seen)."
  else
    fail "VULNERABLE: Rate limit bypassed by rotating X-Forwarded-For header. Zero 429s seen."
  fi
  RESULTS+=("XFF spoof bypass: $( [[ $count_429 -gt 0 ]] && echo PROTECTED || echo VULNERABLE )")
  echo ""
}

# ---------------------------------------------------------------------------
# TEST 5: Signup spam (POST /api/auth/signup)
# Limit is 60/hour. Sends 70 requests.
# ---------------------------------------------------------------------------
test_signup_spam() {
  log "TEST 5 — Signup spam (POST /api/auth/signup × 70)"
  warn "Limit is 60/hour. Sending 70 requests..."
  local count_429=0
  for i in $(seq 1 70); do
    body="{\"name\":\"Spammer\",\"email\":\"spammer${i}_${RANDOM}@mailinator.com\",\"password\":\"P@ssw0rd123!\"}"
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/signup" \
      -H "Content-Type: application/json" -d "$body")
    [[ "$code" == "429" ]] && ((count_429++))
    printf "\r  request %d/70 — status: %s   " "$i" "$code"
  done
  echo ""
  if [[ "$count_429" -gt 0 ]]; then
    ok "Signup rate limiter triggered — got $count_429 × 429 responses."
  else
    fail "Signup rate limiter did NOT trigger after 70 signups."
  fi
  RESULTS+=("Signup spam: $( [[ $count_429 -gt 0 ]] && echo PASS || echo FAIL ) ($count_429 × 429)")
  echo ""
}

# ---------------------------------------------------------------------------
# TEST 6: Viewing schedule spam (POST /api/viewings)
# Public, rate-limited only by general limiter.
# ---------------------------------------------------------------------------
test_viewing_spam() {
  log "TEST 6 — Viewing schedule spam (POST /api/viewings × 50)"
  body='{"propertyId":"000000000000000000000001","date":"2030-01-01","time":"10:00","name":"Bot","email":"bot@bot.com"}'
  blocked=$(spam "POST" "/api/viewings" 50 "$body" "")
  if [[ "$blocked" -gt 0 ]]; then
    ok "Viewing endpoint blocked — got $blocked × 429 responses."
  else
    fail "Viewing endpoint NOT blocked after 50 requests."
  fi
  RESULTS+=("Viewing spam: $( [[ $blocked -gt 0 ]] && echo PASS || echo FAIL ) ($blocked × 429)")
  echo ""
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_summary() {
  echo ""
  echo "======================================================"
  echo -e "${CYAN}                RESULTS SUMMARY${NC}"
  echo "======================================================"
  for r in "${RESULTS[@]}"; do
    if [[ "$r" == *"PASS"* ]] || [[ "$r" == *"PROTECTED"* ]]; then
      echo -e "  ${GREEN}✓${NC} $r"
    else
      echo -e "  ${RED}✗${NC} $r"
    fi
  done
  echo "------------------------------------------------------"
  echo -e "  Tests passed : ${GREEN}$PASS${NC}"
  echo -e "  Tests failed : ${RED}$FAIL${NC}"
  echo "======================================================"
  echo ""
  if [[ "$FAIL" -gt 0 ]]; then
    warn "Some rate limiters are not working as expected."
    warn "Note: all limiters use 'skip: () => isDevelopment', so if"
    warn "NODE_ENV=development they will NEVER fire. Set NODE_ENV=production"
    warn "or NODE_ENV=staging before starting the server to test real limits."
  fi
}

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
echo ""
echo "======================================================"
echo -e "${CYAN}  BalkanEstate API Rate Limit Test${NC}"
echo "  Target: $BASE_URL"
echo "======================================================"
echo ""

check_server
test_general_rate_limit
test_auth_brute_force
test_inquiry_spam
test_ip_spoof_bypass
test_signup_spam
test_viewing_spam
print_summary
