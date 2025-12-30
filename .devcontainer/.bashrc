# LevelUp Development Environment Configuration

# Colorful prompt
export PS1='\[\033[01;32m\]\u@levelup\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '

# Helpful aliases
alias ll='ls -alF'
alias dev='npm run dev:start'
alias dev-stop='npm run dev:stop'
alias test='npm run test'
alias test-watch='npm run test:watch'
alias lint='npm run lint'
alias lint-fix='npm run lint:fix'
alias type-check='npm run type-check'
alias build='npm run build'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline --graph --decorate'

# LevelUp specific helpers
alias check-quality='npm run type-check && npm run lint'
alias fix-quality='npm run lint:fix && npm run format'
alias test-coverage='npm run test:coverage'

# Show helpful commands on login
echo ""
echo "🎮 LevelUp Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Quick Commands:"
echo "  dev          - Start development servers"
echo "  dev-stop     - Stop development servers"
echo "  test         - Run tests"
echo "  lint         - Check code quality"
echo "  lint-fix     - Auto-fix linting issues"
echo "  type-check   - Check TypeScript types"
echo ""
echo "Quality Gates:"
echo "  check-quality  - Run type-check + lint"
echo "  fix-quality    - Auto-fix common issues"
echo "  test-coverage  - Generate coverage report"
echo ""
echo "Current Status:"
npm run health:storage 2>/dev/null || echo "  ⚠️  Storage server not running"
echo ""
