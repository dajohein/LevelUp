#!/bin/bash
# Build script with automatic cache versioning for PWA
# This ensures users always get the latest version on production

set -e

echo "🚀 Starting LevelUp build with cache versioning..."

# Get current timestamp
BUILD_TIMESTAMP=$(date +%s)
echo "📅 Build timestamp: $BUILD_TIMESTAMP"

# Generate features hash from recent commits (last 5 commits for cache busting)
FEATURES_HASH=$(git log --oneline -5 --pretty=format:"%h" | tr '\n' '-' | head -c 20)
echo "🔧 Features hash: $FEATURES_HASH"

# Create a temp service worker with injected values
echo "📝 Updating service worker with build info..."
cp public/sw.js public/sw.js.backup

# Replace placeholders in service worker
sed -i.tmp "s/__BUILD_TIMESTAMP__/$BUILD_TIMESTAMP/g" public/sw.js
sed -i.tmp "s/__FEATURES_HASH__/$FEATURES_HASH/g" public/sw.js
rm -f public/sw.js.tmp

echo "🔍 Service worker updated with:"
echo "  - Build timestamp: $BUILD_TIMESTAMP" 
echo "  - Features hash: $FEATURES_HASH"

# Run the build
echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"

# Restore original service worker for development
echo "🔄 Restoring development service worker..."
mv public/sw.js.backup public/sw.js

# Show cache info for verification
echo ""
echo "📋 Cache Information:"
echo "  Cache version will be: 2.0.0-$FEATURES_HASH"
echo "  Build timestamp: $BUILD_TIMESTAMP"
echo ""
echo "🎯 Production users will automatically get the new version!"
echo "📱 Mobile devices will update their cache on next visit."