# LevelUp DevContainer Configuration

This directory contains the development container configuration for the LevelUp language learning application.

## 🚀 Quick Start

### Using GitHub Codespaces

1. Click "Code" → "Create codespace on main"
2. Wait for the container to build and start
3. Run `dev` to start development servers
4. Open http://localhost:5173 in your browser

### Using VS Code with Docker

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open this folder in VS Code
4. Click "Reopen in Container" when prompted
5. Run `dev` to start development servers

## 📦 What's Included

### Base Image

- **Node.js 22** (LTS)
- **Debian 12** (Bookworm)
- **npm 10.9+**

### VS Code Extensions

- **ESLint** - Code linting and quality
- **Prettier** - Code formatting
- **Jest** - Test runner integration
- **GitLens** - Enhanced Git integration
- **React/TypeScript** - Language support and snippets
- **TODO Tree** - Track technical debt markers

### Pre-configured Settings

- ✅ Format on save with Prettier
- ✅ Auto-fix ESLint on save
- ✅ Auto-organize imports
- ✅ TypeScript strict mode
- ✅ Jest test integration

## 🔧 Environment Configuration

### Ports

- **5173** - Vite development server (main app)
- **3001** - Storage API server (backend)

### Lifecycle Hooks

- **postCreateCommand**: Runs `npm ci` to install dependencies
- **postStartCommand**: Configures Git safe directory

### Shell Aliases

The container includes helpful bash aliases:

```bash
dev          # Start development servers
dev-stop     # Stop development servers
test         # Run test suite
lint         # Check code quality
lint-fix     # Auto-fix linting issues
type-check   # Verify TypeScript types
```

## 🎯 Quality Gates

### Pre-commit Checks (Recommended)

```bash
check-quality   # Runs type-check + lint
fix-quality     # Auto-fixes common issues
test-coverage   # Generates coverage report
```

### Manual Quality Checks

```bash
npm run type-check    # TypeScript compilation check
npm run lint          # ESLint validation
npm run test          # Jest test suite
npm run build         # Production build test
```

## 🐛 Troubleshooting

### Container won't start

1. Ensure Docker Desktop is running
2. Check Docker has enough resources (4GB+ RAM recommended)
3. Rebuild container: Command Palette → "Dev Containers: Rebuild Container"

### Extensions not loading

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "Developer: Reload Window"
3. If still failing, rebuild container

### Ports not forwarding

1. Check the "Ports" tab in VS Code terminal panel
2. Manually forward ports if needed
3. Ensure firewall isn't blocking Docker

### Storage server not starting

```bash
# Check if server is running
npm run health:storage

# Start manually if needed
npm run dev:storage
```

## 📚 Additional Resources

- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Project README](../README.md)
- [Technical Debt Tracker](../docs/TECHNICAL_DEBT_TRACKER.md)

## 🔄 Updating the Container

After modifying `devcontainer.json`:

1. Command Palette → "Dev Containers: Rebuild Container"
2. Or restart Codespace (GitHub Codespaces)

The container will automatically:

- Install new VS Code extensions
- Update environment variables
- Run post-create commands
- Forward configured ports
