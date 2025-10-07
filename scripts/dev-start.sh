#!/bin/bash

# LevelUp Development Server Startup Script
# Starts both storage server and Vite dev server as background services

echo "🚀 Starting LevelUp development environment..."

# Clean up any existing processes
pkill -f "vite\|dev-storage-server" 2>/dev/null || true
sleep 1

# Create logs directory
mkdir -p logs

# Start storage server in background
echo "📦 Starting storage server..."
nohup node scripts/dev-storage-server.cjs > logs/storage.log 2>&1 &
STORAGE_PID=$!
echo "Storage server started (PID: $STORAGE_PID)"

# Start Vite dev server in background
echo "🌐 Starting Vite dev server..."
nohup npm run dev > logs/vite.log 2>&1 &
VITE_PID=$!
echo "Vite server started (PID: $VITE_PID)"

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
echo "📝 Logs:"
echo "   Storage: logs/storage.log"
echo "   Vite: logs/vite.log"
echo ""
echo "🛑 To stop servers: ./scripts/dev-stop.sh"
echo "🔄 To restart: ./scripts/dev-restart.sh"

# Save PIDs for cleanup
echo "$STORAGE_PID" > logs/storage.pid
echo "$VITE_PID" > logs/vite.pid