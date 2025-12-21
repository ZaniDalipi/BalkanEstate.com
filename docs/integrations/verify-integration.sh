#!/bin/bash

echo "🔍 Balkan Estate - Integration Verification"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_code=$5

    echo -n "Testing $name... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (Expected $expected_code, got $http_code)"
        echo "   Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Backend Health
echo -e "${BLUE}1. Testing Backend Health${NC}"
test_endpoint "Health endpoint" "GET" "http://localhost:5001/health" "" 200
echo ""

# Test 2: Authentication Endpoints
echo -e "${BLUE}2. Testing Authentication${NC}"

# Generate random email to avoid duplicates
RANDOM_EMAIL="test-$(date +%s)@example.com"

# Test signup
SIGNUP_DATA="{\"email\":\"$RANDOM_EMAIL\",\"password\":\"Password123\",\"name\":\"Test User\",\"phone\":\"+1234567890\"}"
if test_endpoint "User signup" "POST" "http://localhost:5001/api/auth/signup" "$SIGNUP_DATA" 201; then
    # Extract token from response
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo -e "   ${GREEN}Token received: ${TOKEN:0:20}...${NC}"
    fi
fi

# Test login
LOGIN_DATA="{\"email\":\"$RANDOM_EMAIL\",\"password\":\"Password123\"}"
if test_endpoint "User login" "POST" "http://localhost:5001/api/auth/login" "$LOGIN_DATA" 200; then
    # Extract token
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo ""

# Test 3: Property Endpoints (if we have a token)
echo -e "${BLUE}3. Testing Property Endpoints${NC}"

if [ -n "$TOKEN" ]; then
    # Create a test property
    PROPERTY_DATA='{
        "title": "Test Property",
        "description": "A beautiful test property",
        "price": 250010,
        "location": {
            "address": "123 Test St",
            "city": "Prishtina",
            "country": "Kosovo",
            "coordinates": {
                "lat": 42.6629,
                "lng": 21.1655
            }
        },
        "propertyType": "apartment",
        "bedrooms": 3,
        "bathrooms": 2,
        "area": 120,
        "features": ["parking", "balcony"]
    }'

    echo -n "Creating property... "
    CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:5001/api/properties" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$PROPERTY_DATA" 2>&1)

    CREATE_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
    CREATE_BODY=$(echo "$CREATE_RESPONSE" | head -n-1)

    if [ "$CREATE_CODE" -eq 201 ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $CREATE_CODE)"
        ((PASSED++))

        # Extract property ID
        PROPERTY_ID=$(echo "$CREATE_BODY" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
        echo -e "   ${GREEN}Property created: $PROPERTY_ID${NC}"

        # Test get all properties
        test_endpoint "Get all properties" "GET" "http://localhost:5001/api/properties" "" 200

        # Test get single property
        if [ -n "$PROPERTY_ID" ]; then
            test_endpoint "Get property by ID" "GET" "http://localhost:5001/api/properties/$PROPERTY_ID" "" 200
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (Expected 201, got $CREATE_CODE)"
        echo "   Response: $CREATE_BODY"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no auth token)${NC}"
fi

echo ""

# Test 4: Favorites Endpoint
echo -e "${BLUE}4. Testing Favorites${NC}"

if [ -n "$TOKEN" ] && [ -n "$PROPERTY_ID" ]; then
    FAVORITE_DATA="{\"propertyId\":\"$PROPERTY_ID\"}"

    echo -n "Adding to favorites... "
    FAV_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:5001/api/favorites" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$FAVORITE_DATA" 2>&1)

    FAV_CODE=$(echo "$FAV_RESPONSE" | tail -n1)

    if [ "$FAV_CODE" -eq 201 ]; then
        echo -e "${GREEN}✅ PASSED${NC} (HTTP $FAV_CODE)"
        ((PASSED++))

        # Test get favorites
        test_endpoint "Get user favorites" "GET" "http://localhost:5001/api/favorites" "" 200
    else
        echo -e "${RED}❌ FAILED${NC} (Expected 201, got $FAV_CODE)"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Skipped (no auth token or property)${NC}"
fi

echo ""

# Test 5: Saved Searches
echo -e "${BLUE}5. Testing Saved Searches${NC}"

if [ -n "$TOKEN" ]; then
    SEARCH_DATA='{
        "name": "Test Search",
        "filters": {
            "priceRange": { "min": 100000, "max": 300000 },
            "propertyTypes": ["apartment"],
            "bedrooms": 3
        }
    }'

    test_endpoint "Save search" "POST" "http://localhost:5001/api/saved-searches" "$SEARCH_DATA" 201
    test_endpoint "Get saved searches" "GET" "http://localhost:5001/api/saved-searches" "" 200
else
    echo -e "${YELLOW}⚠️  Skipped (no auth token)${NC}"
fi

echo ""

# Test 6: Database Connection
echo -e "${BLUE}6. Testing Database Connection${NC}"

if command -v mongosh &> /dev/null; then
    echo -n "Connecting to MongoDB... "
    if mongosh --quiet --eval "db.version()" balkan-estate &> /dev/null; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))

        # Show database stats
        echo -n "Checking collections... "
        COLLECTIONS=$(mongosh --quiet --eval "db.getCollectionNames()" balkan-estate 2>/dev/null)
        echo -e "${GREEN}✅${NC}"
        echo "   Collections: $COLLECTIONS"
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
elif command -v mongo &> /dev/null; then
    echo -n "Connecting to MongoDB... "
    if mongo --quiet --eval "db.version()" balkan-estate &> /dev/null; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB CLI not found (this is okay if using Atlas)${NC}"
fi

echo ""

# Summary
echo "==========================================="
echo -e "${BLUE}Summary${NC}"
echo "==========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your integration is working correctly.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Create an account"
    echo "  3. Start creating property listings!"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the errors above.${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Make sure backend is running: cd backend && npm run dev"
    echo "  - Make sure MongoDB is running"
    echo "  - Check backend/.env for correct configuration"
    echo ""
    exit 1
fi
