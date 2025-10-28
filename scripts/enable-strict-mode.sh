#!/bin/bash

# TypeScript Strict Mode Gradual Enablement Script
# This script helps enable noUnusedLocals and noUnusedParameters gradually

echo "🔧 TypeScript Strict Mode Gradual Enablement"
echo "============================================="

# Function to add ts-ignore comments for unused variables
add_ts_ignore_for_file() {
    local file="$1"
    local error_count=$(npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 | grep "$file" | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        echo "📝 Adding TypeScript ignore comment to $file ($error_count errors)"
        
        # Add comment at the top of the file (after imports)
        sed -i '1a\\n// TODO: Fix unused variables and parameters (TS strict mode)' "$file"
        sed -i '2a\// @ts-ignore - Temporarily disabled for unused variables' "$file"
    fi
}

# Get list of files with issues
echo "📊 Analyzing files with TypeScript strict mode issues..."
files_with_issues=$(npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1 | grep -E "error TS6133|error TS6196" | cut -d'(' -f1 | sort | uniq)

echo "📋 Files that need attention:"
echo "$files_with_issues"

echo ""
echo "🎯 Recommended approach:"
echo "1. Enable strict flags in tsconfig.json"
echo "2. Add per-file suppressions for complex files"
echo "3. Fix files gradually, starting with services"
echo "4. Remove suppressions as files are fixed"

echo ""
echo "Would you like to proceed with this approach? (y/n)"