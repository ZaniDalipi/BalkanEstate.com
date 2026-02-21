#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install frontend dependencies (root)
cd "$CLAUDE_PROJECT_DIR"
npm install

# Install backend dependencies
cd "$CLAUDE_PROJECT_DIR/backend"
npm install

# Pre-download MongoDB binary for mongodb-memory-server (used by tests)
# This avoids slow downloads when running tests for the first time
npx mongodb-memory-server-global-config -- --version 7.0.24 2>/dev/null || \
  node -e "
    const { MongoMemoryServer } = require('mongodb-memory-server');
    MongoMemoryServer.create().then(s => s.stop()).catch(() => {});
  " 2>/dev/null || true
