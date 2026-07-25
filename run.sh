#!/bin/bash
# run.sh - Startup script for SurfBill

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Add local node_modules binaries to PATH so we don't depend on global installs
export PATH=$(pwd)/node_modules/.bin:$(pwd)/frontend/node_modules/.bin:$PATH

echo "🚀 Starting SurfBill System..."
echo "--------------------------------"

# Check if concurrently exists
if ! command -v concurrently &> /dev/null; then
    echo "❌ Error: 'concurrently' not found in node_modules. Run 'npm install' first (if you can)."
    exit 1
fi

# Run backend and frontend continuously
concurrently -n "API,WEB" -c "blue,magenta" \
    "ts-node src/server.ts" \
    "cd frontend && vite"
