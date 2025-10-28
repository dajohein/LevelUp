#!/bin/bash

# TypeScript Strict Mode Progress Tracker
# Track and fix remaining unused variable issues

set -e

echo "🎯 TypeScript Strict Mode Progress Tracker"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "📊 Current Status:"
current_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
echo "Total TypeScript errors: $current_errors"

echo ""
echo "📋 Breakdown by file (remaining errors):"
npx tsc --noEmit 2>&1 | \
    grep -E "error TS6133|error TS6196" | \
    cut -d'(' -f1 | \
    sort | uniq -c | \
    sort -n | \
    while read count file; do
        if [ "$count" -le 3 ]; then
            echo -e "  ${GREEN}🟢 $file: $count errors (QUICK WIN)${NC}"
        elif [ "$count" -le 5 ]; then
            echo -e "  ${YELLOW}🟡 $file: $count errors (MEDIUM)${NC}"
        else
            echo -e "  ${BLUE}🔵 $file: $count errors (LARGE)${NC}"
        fi
    done

echo ""
echo "🎯 Recommended Next Steps:"
echo ""
echo "1. 🟢 QUICK WINS (≤3 errors) - Start here:"
npx tsc --noEmit 2>&1 | \
    grep -E "error TS6133|error TS6196" | \
    cut -d'(' -f1 | \
    sort | uniq -c | \
    sort -n | \
    head -5 | \
    while read count file; do
        if [ "$count" -le 3 ]; then
            echo "   📄 Fix $file ($count errors)"
        fi
    done

echo ""
echo "2. 🟡 MEDIUM EFFORT (4-5 errors) - Do after quick wins:"
npx tsc --noEmit 2>&1 | \
    grep -E "error TS6133|error TS6196" | \
    cut -d'(' -f1 | \
    sort | uniq -c | \
    sort -n | \
    while read count file; do
        if [ "$count" -ge 4 ] && [ "$count" -le 5 ]; then
            echo "   📄 Fix $file ($count errors)"
        fi
    done

echo ""
echo "📚 How to fix common issues:"
echo "• Unused imports: Remove from import statement"
echo "• Unused styled components: Remove the const declaration"
echo "• Unused parameters: Prefix with underscore: '_unusedParam'"
echo "• Unused variables: Remove or prefix with underscore"

echo ""
echo "🔧 Quick fix commands:"
echo "• Check specific file: npx tsc --noEmit src/path/to/file.tsx"
echo "• Build project: npm run build"
echo "• Run this tracker: ./scripts/track-typescript-progress.sh"

echo ""
echo "✅ Progress Goal: Reduce to 0 errors, then remove suppressions!"

# Show actual errors for first quick win file
echo ""
echo "📝 Detailed errors for first quick win file:"
first_quick_win=$(npx tsc --noEmit 2>&1 | \
    grep -E "error TS6133|error TS6196" | \
    cut -d'(' -f1 | \
    sort | uniq -c | \
    sort -n | \
    head -1 | \
    awk '{print $2}')

if [ ! -z "$first_quick_win" ]; then
    echo "📄 $first_quick_win:"
    npx tsc --noEmit 2>&1 | grep "$first_quick_win" | head -5
fi