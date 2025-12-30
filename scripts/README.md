# Development and Validation Scripts

This directory contains scripts for development server management and language validation.

## Development Server Scripts

### `dev-start.sh`
Starts both storage server and Vite dev server as background services.

**Logging (Twelve-Factor):**
- By default, logs stream to stdout (standard output)
- Use `--log-files` flag to write logs to `logs/` directory instead

**Usage:**
```bash
# Stream logs to stdout (recommended)
npm run dev:start
# or
./scripts/dev-start.sh

# Write logs to files
./scripts/dev-start.sh --log-files
```

### `dev-stop.sh`
Stops all development servers.
**Usage:**
```bash
npm run dev:stop
# or
./scripts/dev-stop.sh
```

### `dev-restart.sh`
Restarts the development environment.
**Usage:**
```bash
npm run dev:restart
# or
./scripts/dev-restart.sh
```

### `dev-storage-server.cjs`
Individual storage server for API endpoints.
**Usage:**
```bash
npm run dev:storage
# or
node scripts/dev-storage-server.cjs
```

## Development Workflow

**Best Practice for GitHub Codespaces:**

1. **Start development environment:**
   ```bash
   npm run dev:start
   ```

2. **Check health:**
   ```bash
   npm run health:storage
   ```

3. **Access your app:**
   - Web app: http://localhost:5173
   - API health: http://localhost:5173/api/health
   - API status: http://localhost:5173/api/status

4. **View logs (if needed):**
   ```bash
   # When using --log-files flag:
   tail -f logs/storage.log  # Storage server logs
   tail -f logs/vite.log     # Vite server logs
   
   # Default (stdout): logs appear in your terminal
   ```

5. **Stop when done:**
   ```bash
   npm run dev:stop
   ```

## Language Validation Scripts

### `validate-languages.cjs`
Basic validation script that checks:
- Language directory structure
- Required JSON files (index.json, module files)
- Basic configuration completeness
- Language rules configuration

**Usage:**
```bash
node scripts/validate-languages.cjs
```

### `comprehensive-validation.cjs`
Comprehensive validation script that performs in-depth testing:
- Language metadata validation
- Module content verification
- Language rules testing
- Sample word verification
- Configuration integration testing

**Usage:**
```bash
node scripts/comprehensive-validation.cjs
```

## When to Use

- **During development**: Use these scripts to verify language configurations
- **Before deployment**: Run comprehensive validation to ensure all languages work
- **Adding new languages**: Use to verify new language setups
- **CI/CD**: Include in automated testing pipelines

## Adding to CI/CD

Add to your package.json scripts:
```json
{
  "scripts": {
    "validate:languages": "node scripts/validate-languages.cjs",
    "validate:comprehensive": "node scripts/comprehensive-validation.cjs"
  }
}
```

## Requirements

- Node.js (CommonJS compatible)
- Access to src/data and src/config directories
- Read access to language configuration files