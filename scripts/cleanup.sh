#!/bin/bash

# LevelUp Project Cleanup Script
# Removes temporary files, build artifacts, and organizes the project

echo "🧹 Starting LevelUp project cleanup..."

# Remove build artifacts
echo "📦 Removing build artifacts..."
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf .vite/

# Remove temporary files
echo "🗑️ Removing temporary files..."
find . -name "*.tmp" -delete
find . -name "*.log" -delete
find . -name ".DS_Store" -delete

# Clean npm cache (if needed)
echo "🔄 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || echo "   npm cache clean not needed"

# Remove unnecessary node_modules if they exist
if [ -d "node_modules" ]; then
    echo "📚 Node modules directory exists (size: $(du -sh node_modules | cut -f1))"
    echo "   Run 'npm ci' to reinstall if needed"
fi

# Organize files
echo "📁 Organizing project structure..."
# Ensure scripts directory exists
mkdir -p scripts/pwa

# Check for any leftover temporary files
echo "🔍 Checking for leftover files..."
TEMP_FILES=$(find . -name "*.temp" -o -name "*.bak" -o -name "*~" 2>/dev/null)
if [ -n "$TEMP_FILES" ]; then
    echo "   Found temporary files:"
    echo "$TEMP_FILES"
    echo "   Consider removing them manually"
else
    echo "   ✅ No temporary files found"
fi

# Check git status
echo "📋 Git status:"
git status --porcelain | head -5

# Summary
echo ""
echo "✅ Cleanup complete!"
echo "📊 Project structure:"
echo "   Source files: $(find src -name "*.ts" -o -name "*.tsx" | wc -l) TypeScript files"
echo "   Components: $(find src/components -name "*.tsx" | wc -l) React components"
echo "   PWA icons: $(find public/icons -name "*.png" | wc -l) icon sizes"
echo "   Documentation: $(find docs -name "*.md" | wc -l) markdown files"

echo ""
echo "🚀 Ready for development!"
echo "   Run 'npm run dev' to start development server"
echo "   Run 'npm run build' to create production build"
echo "   Run 'npm run icons:generate' to regenerate PWA icons"