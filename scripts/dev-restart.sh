#!/bin/bash

# LevelUp Development Server Restart Script
# Restarts both storage server and Vite dev server

echo "🔄 Restarting LevelUp development environment..."

# Stop servers
./scripts/dev-stop.sh

# Wait a moment
sleep 1

# Start servers
./scripts/dev-start.sh