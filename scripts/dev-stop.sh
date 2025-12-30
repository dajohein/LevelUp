#!/bin/bash

# LevelUp Development Server Stop Script
# Stops both storage server and Vite dev server

echo "🛑 Stopping LevelUp development environment..."

# Kill by PID if available (check both locations)
if [ -f logs/storage.pid ]; then
    STORAGE_PID=$(cat logs/storage.pid)
    kill $STORAGE_PID 2>/dev/null && echo "📦 Storage server stopped (PID: $STORAGE_PID)"
    rm -f logs/storage.pid
elif [ -f /tmp/levelup-storage.pid ]; then
    STORAGE_PID=$(cat /tmp/levelup-storage.pid)
    kill $STORAGE_PID 2>/dev/null && echo "📦 Storage server stopped (PID: $STORAGE_PID)"
    rm -f /tmp/levelup-storage.pid
fi

if [ -f logs/vite.pid ]; then
    VITE_PID=$(cat logs/vite.pid)
    kill $VITE_PID 2>/dev/null && echo "🌐 Vite server stopped (PID: $VITE_PID)"
    rm -f logs/vite.pid
elif [ -f /tmp/levelup-vite.pid ]; then
    VITE_PID=$(cat /tmp/levelup-vite.pid)
    kill $VITE_PID 2>/dev/null && echo "🌐 Vite server stopped (PID: $VITE_PID)"
    rm -f /tmp/levelup-vite.pid
fi

# Fallback: kill by process name
pkill -f "vite\|dev-storage-server" 2>/dev/null && echo "🧹 Cleaned up remaining processes"

echo "✅ Development environment stopped"