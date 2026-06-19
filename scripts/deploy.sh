#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

PID_FILE=".server.pid"
LOG_FILE="server.log"

# Build the site
echo "[deploy] Building Astro site..."
npm run build

# Stop the existing server
echo "[deploy] Stopping old server..."
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill "$OLD_PID" 2>/dev/null; then
    echo "[deploy] Killed old server (PID $OLD_PID)"
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# Also clean up any stray processes using the same entrypoint
pkill -f "dist/server/entry.mjs" 2>/dev/null || true

# Start the production server
echo "[deploy] Starting production server on 0.0.0.0:4321..."
export HOST=0.0.0.0
export PORT=4321
export NODE_ENV=production

nohup node ./dist/server/entry.mjs > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

echo "[deploy] Server running (PID: $NEW_PID). Logs: $LOG_FILE"
echo "[deploy] To check status: ps -p $NEW_PID"
echo "[deploy] To view logs: tail -f $LOG_FILE"
