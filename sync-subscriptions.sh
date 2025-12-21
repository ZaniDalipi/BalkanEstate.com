#!/bin/bash

# Sync All Subscription Counters Script
# This script calls the backend API to recount all properties and sync subscription counters

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Syncing all subscription counters from database...${NC}\n"

# Get API URL from environment or use default
API_URL="${VITE_API_URL:-http://localhost:5001/api}"

# Get auth token (you need to be logged in)
echo -e "${YELLOW}📝 Please paste your auth token (from localStorage: balkan_estate_token):${NC}"
read -r TOKEN

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No token provided. Please login first and copy your token.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📡 Calling ${API_URL}/auth/sync-all-subscriptions...${NC}\n"

# Call the API endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "${API_URL}/auth/sync-all-subscriptions")

# Extract HTTP status code (last line)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)

# Extract response body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${YELLOW}Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "\n${GREEN}✅ Subscription counters synced successfully!${NC}"
    echo -e "${GREEN}All users' subscription data has been updated from the database.${NC}"
else
    echo -e "\n${RED}❌ Sync failed with status code: ${HTTP_STATUS}${NC}"
    exit 1
fi
