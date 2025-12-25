#!/bin/bash

# ============================================
# Manual Test Script for Engagement Notifications
# ============================================
#
# Prerequisites:
# 1. Backend server running: npm run dev
# 2. You need a valid JWT token (login first)
# 3. You need an existing property ID
#
# Usage:
#   ./src/scripts/testEngagementManual.sh <JWT_TOKEN> <PROPERTY_ID>
#
# Example:
#   ./src/scripts/testEngagementManual.sh "eyJhbG..." "507f1f77bcf86cd799439011"

API_URL="${API_URL:-http://localhost:5001/api}"
TOKEN="$1"
PROPERTY_ID="$2"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "============================================"
echo "  Engagement Notification System Test"
echo "============================================"
echo -e "${NC}"

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}Usage: $0 <JWT_TOKEN> [PROPERTY_ID]${NC}"
  echo ""
  echo "To get a JWT token, login via the API:"
  echo "  curl -X POST $API_URL/auth/login \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}'"
  echo ""
  echo "Then run this script with the token."
  exit 1
fi

echo -e "${CYAN}1. Testing: Get Unread Count${NC}"
echo "   GET /api/notifications/unread-count"
RESPONSE=$(curl -s -X GET "$API_URL/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN")
echo "   Response: $RESPONSE"
echo ""

echo -e "${CYAN}2. Testing: Get All Notifications${NC}"
echo "   GET /api/notifications"
RESPONSE=$(curl -s -X GET "$API_URL/notifications?limit=5" \
  -H "Authorization: Bearer $TOKEN")
echo "   Response: $RESPONSE" | head -c 500
echo "..."
echo ""

echo -e "${CYAN}3. Testing: Get Unread Notifications${NC}"
echo "   GET /api/notifications/unread"
RESPONSE=$(curl -s -X GET "$API_URL/notifications/unread" \
  -H "Authorization: Bearer $TOKEN")
echo "   Response: $RESPONSE" | head -c 500
echo "..."
echo ""

if [ ! -z "$PROPERTY_ID" ]; then
  echo -e "${CYAN}4. Testing: Track View (triggers milestone check)${NC}"
  echo "   POST /api/view-stats/track"
  RESPONSE=$(curl -s -X POST "$API_URL/view-stats/track" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"entityType\":\"property\",\"entityId\":\"$PROPERTY_ID\"}")
  echo "   Response: $RESPONSE"
  echo ""

  echo -e "${YELLOW}Note: Milestone notifications are triggered when view counts${NC}"
  echo -e "${YELLOW}reach: 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000${NC}"
  echo ""
fi

echo -e "${CYAN}5. Testing: Mark All as Read${NC}"
echo "   PATCH /api/notifications/read-all"
RESPONSE=$(curl -s -X PATCH "$API_URL/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN")
echo "   Response: $RESPONSE"
echo ""

echo -e "${GREEN}============================================"
echo "  Test Complete!"
echo "============================================${NC}"
echo ""
echo "To trigger a milestone notification manually:"
echo "1. Create/use a property you own"
echo "2. Update its view count in the database to a milestone value (e.g., 50, 100)"
echo "3. Track another view via API"
echo "4. Check notifications - you should see a fun message!"
