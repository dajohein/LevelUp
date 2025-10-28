#!/bin/bash

# TypeScript Strict Mode Implementation Script
# Automatically enables strict mode with temporary suppressions

set -e

echo "🚀 Enabling TypeScript Strict Mode with Gradual Rollout"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to add suppression to a file
add_suppression() {
    local file="$1"
    local error_count="$2"
    
    if [ ! -f "$file" ]; then
        echo "❌ File $file not found"
        return 1
    fi
    
    # Check if suppression already exists
    if grep -q "eslint-disable.*no-unused-vars" "$file" 2>/dev/null; then
        echo "⏭️  Suppression already exists in $file"
        return 0
    fi
    
    echo "📝 Adding suppression to $file ($error_count errors)"
    
    # Create a temporary file with the suppression
    {
        head -n 1 "$file"  # Keep the first line (usually import)
        echo "/* eslint-disable @typescript-eslint/no-unused-vars */"
        echo "// TODO: Clean up unused variables and parameters ($error_count issues)"
        echo "// This suppression will be removed once unused variables are cleaned up"
        tail -n +2 "$file"  # Rest of the file
    } > "${file}.tmp"
    
    mv "${file}.tmp" "$file"
    echo "✅ Added suppression to $file"
}

# Get current error count
echo "📊 Analyzing current TypeScript errors..."
current_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
echo "Current errors (relaxed mode): $current_errors"

# Test strict mode
echo "🔍 Testing strict mode impact..."
strict_errors=$(npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 | grep -c "error TS" || echo "0")
echo "Errors with strict mode: $strict_errors"
new_errors=$((strict_errors - current_errors))
echo "New errors from strict mode: $new_errors"

if [ "$new_errors" -gt 0 ]; then
    echo ""
    echo "🎯 Files needing suppressions (top 10):"
    
    # Get top problematic files
    npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 | \
        grep -E "error TS6133|error TS6196" | \
        cut -d'(' -f1 | \
        sort | uniq -c | \
        sort -nr | \
        head -10 | \
        while read count file; do
            echo "  📄 $file: $count errors"
            
            # Add suppression for files with 5+ errors
            if [ "$count" -ge 5 ]; then
                add_suppression "$file" "$count"
            fi
        done
fi

echo ""
echo "🔧 Enabling strict mode in tsconfig.json..."

# Update tsconfig.json to enable strict mode
cp tsconfig.json tsconfig.json.backup

# Use Node.js to safely update the JSON
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
config.compilerOptions.noUnusedLocals = true;
config.compilerOptions.noUnusedParameters = true;

// Update the comments
const content = fs.readFileSync('tsconfig.json', 'utf8');
const updated = content
  .replace('\"noUnusedLocals\": false, // Temporarily disabled for comprehensive AI system with future-ready methods', '\"noUnusedLocals\": true, // Enabled with gradual rollout - see TYPESCRIPT_STRICT_MODE_PLAN.md')
  .replace('\"noUnusedParameters\": false, // Temporarily disabled for advanced AI system with future-ready methods', '\"noUnusedParameters\": true, // Enabled with gradual rollout - see TYPESCRIPT_STRICT_MODE_PLAN.md');

fs.writeFileSync('tsconfig.json', updated);
"

echo "✅ Updated tsconfig.json"

echo ""
echo "🧪 Testing compilation..."
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ TypeScript compilation successful!${NC}"
else
    echo -e "${RED}❌ Compilation failed. Reverting changes...${NC}"
    mv tsconfig.json.backup tsconfig.json
    exit 1
fi

rm -f tsconfig.json.backup

echo ""
echo -e "${GREEN}🎉 TypeScript Strict Mode Successfully Enabled!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Files with 5+ errors have been given temporary suppressions"
echo "2. Start fixing small files with few errors"
echo "3. Remove suppressions as files are cleaned up"
echo "4. See docs/TYPESCRIPT_STRICT_MODE_PLAN.md for detailed plan"
echo ""
echo "📊 Track progress with:"
echo "  npx tsc --noEmit | grep -c 'error TS' || echo '0'"
echo ""
echo "🎯 Quick wins (files with <5 errors):"
npx tsc --noEmit 2>&1 | \
    grep -E "error TS6133|error TS6196" | \
    cut -d'(' -f1 | \
    sort | uniq -c | \
    sort -n | \
    head -5 | \
    while read count file; do
        if [ "$count" -lt 5 ]; then
            echo "  📄 $file: $count errors"
        fi
    done

echo ""
echo -e "${YELLOW}💡 Tip: Fix files with fewest errors first for quick wins!${NC}"