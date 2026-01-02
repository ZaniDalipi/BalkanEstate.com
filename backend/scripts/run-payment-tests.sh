#!/bin/bash

# ============================================================
# Payment System Test Runner
#
# Runs all payment-related tests for development
# Usage: ./scripts/run-payment-tests.sh [test-type]
#
# Options:
#   unit        - Run unit tests only
#   integration - Run integration tests only
#   api         - Run API endpoint tests only
#   all         - Run all tests (default)
#   watch       - Run tests in watch mode
# ============================================================

TEST_TYPE="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}========================================"
echo "  Payment System Test Runner"
echo "========================================${NC}"
echo ""

cd "$BACKEND_DIR"

case "$TEST_TYPE" in
    unit)
        echo -e "${YELLOW}Running unit tests...${NC}"
        npm test -- --testPathPattern="payment-services" --coverage
        ;;

    integration)
        echo -e "${YELLOW}Running integration tests...${NC}"
        npm test -- --testPathPattern="payment-integration" --coverage
        ;;

    api)
        echo -e "${YELLOW}Running API endpoint tests...${NC}"
        npm test -- --testPathPattern="payments.test" --coverage
        ;;

    watch)
        echo -e "${YELLOW}Running tests in watch mode...${NC}"
        npm test -- --testPathPattern="payment" --watch
        ;;

    all)
        echo -e "${YELLOW}Running all payment tests...${NC}"
        echo ""

        # Run unit tests
        echo -e "${BLUE}[1/3] Unit Tests${NC}"
        npm test -- --testPathPattern="payment-services" --silent || true
        echo ""

        # Run integration tests
        echo -e "${BLUE}[2/3] Integration Tests${NC}"
        npm test -- --testPathPattern="payment-integration" --silent || true
        echo ""

        # Run API tests
        echo -e "${BLUE}[3/3] API Tests${NC}"
        npm test -- --testPathPattern="payments.test" --silent || true
        echo ""

        # Run quick endpoint test
        echo -e "${BLUE}[Bonus] Quick API Check${NC}"
        if curl -s http://localhost:5001/health > /dev/null 2>&1; then
            echo "Server is running, testing endpoints..."
            chmod +x "$BACKEND_DIR/test-payments.sh"
            "$BACKEND_DIR/test-payments.sh" 2>/dev/null || true
        else
            echo -e "${YELLOW}Server not running. Start with 'npm run dev' to run API tests.${NC}"
        fi
        ;;

    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo ""
        echo "Usage: $0 [test-type]"
        echo ""
        echo "Options:"
        echo "  unit        - Run unit tests only"
        echo "  integration - Run integration tests only"
        echo "  api         - Run API endpoint tests only"
        echo "  all         - Run all tests (default)"
        echo "  watch       - Run tests in watch mode"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
