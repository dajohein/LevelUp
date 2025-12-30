#!/bin/bash

# LevelUp Development Server Startup Script
# Starts both storage server and Vite dev server as background services
# Logs stream to stdout by default (Twelve-Factor); use --log-files to write to disk

# Parse arguments
USE_LOG_FILES=false
if [[ "$1" == "--log-files" ]]; then
  USE_LOG_FILES=true
fi

echo "🚀 Starting LevelUp development environment..."

# Clean up any existing processes
pkill -f "vite\|dev-storage-server" 2>/dev/null || true
sleep 1

# Start storage server in background
echo "📦 Starting storage server..."
if [ "$USE_LOG_FILES" = true ]; then
  mkdir -p logs
  nohup node scripts/dev-storage-server.cjs > logs/storage.log 2>&1 &
  STORAGE_PID=$!
  echo "Storage server started (PID: $STORAGE_PID, logging to logs/storage.log)"
else
  node scripts/dev-storage-server.cjs &
  STORAGE_PID=$!
  echo "Storage server started (PID: $STORAGE_PID, logging to stdout)"
fi

# Start Vite dev server in background
echo "🌐 Starting Vite dev server..."
if [ "$USE_LOG_FILES" = true ]; then
  nohup npm run dev > logs/vite.log 2>&1 &
  VITE_PID=$!
  echo "Vite server started (PID: $VITE_PID, logging to logs/vite.log)"
else
  npm run dev &
  VITE_PID=$!
  echo "Vite server started (PID: $VITE_PID, logging to stdout)"
fi

# Wait for servers to start
echo "⏳ Waiting for servers to initialize..."
sleep 3

# Test servers
echo "🔍 Testing server health..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Storage server: healthy"
else
    echo "❌ Storage server: not responding"
fi

if curl -s http://localhost:5173/api/health > /dev/null; then
    echo "✅ Vite proxy: healthy"
else
    echo "❌ Vite proxy: not responding"
fi

echo ""
echo "🎉 Development environment ready!"
echo "📱 Web app: http://localhost:5173"
echo "🔧 API health: http://localhost:5173/api/health"
echo "📊 API status: http://localhost:5173/api/status"
echo ""
if [ "$USE_LOG_FILES" = true ]; then
  echo "📝 Logs written to:"
  echo "   Storage: logs/storage.log (tail -f logs/storage.log)"
  echo "   Vite: logs/vite.log (tail -f logs/vite.log)"
else
  echo "📝 Logs streaming to stdout (Twelve-Factor)"
  echo "   Use --log-files flag to write logs to disk instead"
fi
echo ""
echo "🛑 To stop servers: ./scripts/dev-stop.sh"
echo "🔄 To restart: ./scripts/dev-restart.sh"

# Save PIDs for cleanup
if [ "$USE_LOG_FILES" = true ]; then
  mkdir -p logs
  echo "$STORAGE_PID" > logs/storage.pid
  echo "$VITE_PID" > logs/vite.pid
else
  # Store PIDs in /tmp for cleanup
  echo "$STORAGE_PID" > /tmp/levelup-storage.pid
  echo "$VITE_PID" > /tmp/levelup-vite.pid
fi