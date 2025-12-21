#!/bin/bash

# Test Runner Script for Subscription Counter Tests
# Usage: ./run-tests.sh [backend|frontend|all|watch]

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Balkan Estate Test Runner${NC}\n"

case "${1:-all}" in
  backend)
    echo -e "${GREEN}Running Backend Tests...${NC}"
    cd backend
    npm test
    ;;

  frontend)
    echo -e "${GREEN}Running Frontend Tests...${NC}"
    npm test
    ;;

  counters)
    echo -e "${GREEN}Running Subscription Counter Tests...${NC}"
    cd backend
    npm run test:counters
    ;;

  integration)
    echo -e "${GREEN}Running Integration Tests...${NC}"
    cd backend
    npm run test:integration
    ;;

  watch)
    echo -e "${GREEN}Running Tests in Watch Mode...${NC}"
    cd backend
    npm run test:watch
    ;;

  coverage)
    echo -e "${GREEN}Running Tests with Coverage...${NC}"
    cd backend
    npm run test:coverage
    ;;

  all)
    echo -e "${GREEN}Running All Tests...${NC}\n"

    echo -e "${BLUE}1. Backend Unit Tests${NC}"
    cd backend
    npm test
    cd ..

    echo -e "\n${BLUE}2. Frontend Tests${NC}"
    npm test -- --run

    echo -e "\n${GREEN}✅ All tests completed!${NC}"
    ;;

  *)
    echo "Usage: $0 [backend|frontend|counters|integration|watch|coverage|all]"
    echo ""
    echo "Options:"
    echo "  backend      - Run all backend tests"
    echo "  frontend     - Run all frontend tests"
    echo "  counters     - Run subscription counter tests only"
    echo "  integration  - Run integration tests only"
    echo "  watch        - Run tests in watch mode"
    echo "  coverage     - Run tests with coverage report"
    echo "  all          - Run all tests (default)"
    exit 1
    ;;
esac
