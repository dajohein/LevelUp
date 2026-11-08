# Development and Validation Scripts

This directory contains scripts for development server management and language validation.

## Development Server Scripts

### `dev-start.sh`
Starts both storage server and Vite dev server as background services.
The workspace-local supervisor tracks only processes it starts. It waits up to
15 seconds for the storage API, web server, and proxied API health check; a
failed start stops its own processes and returns a nonzero exit code.
Occupied ports are errors, not an instruction to stop other processes.
Starting again while this workspace's servers are running is also an error.
Managed process groups have a persistent ownership anchor: shutdown waits for
their descendants and escalates to SIGKILL if they ignore SIGTERM. If ownership
cannot be verified, the supervisor remains available instead of signalling an
unverified group. Logging failures also stop the managed services.

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
Stops only the services started by `dev-start.sh` in this checkout. Manually
started services and other worktrees are not managed.
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

Both commands resolve the workspace from the script location, not the current
directory. `dev:restart` accepts `--log-files` when invoked directly as
`./scripts/dev-restart.sh --log-files`.

### Ports, health, and recovery

The default storage and Vite ports are 3001 and 5173. To run multiple
workspaces at once, choose distinct ports and use the same environment for
start, restart, and health checks:

```bash
export LEVELUP_STORAGE_PORT=3002 LEVELUP_VITE_PORT=5174
npm run dev:start
npm run health:storage
npm run dev:stop
```

`health:storage` requires a successful HTTP response with `status: "healthy"`
through the Vite proxy; it returns nonzero on errors, invalid responses, or
timeouts. Each HTTP request has a one-second timeout. Set
`LEVELUP_DEV_TIMEOUT_MS` (1–120000, default 15000) to adjust the startup
deadline.

The supervisor record and control lock are stored under the ignored
`.levelup-dev/` directory. Stale PID records are discarded without signalling
the recorded process. If a control command was forcibly terminated and left a
lock behind, first confirm that no start/stop command is running in this
workspace, then remove the empty `.levelup-dev/lock` directory and retry. A
forcibly killed supervisor may leave its children running; inspect and stop
those specific processes manually rather than killing processes by name.
Process identity verification uses `ps`; the supervisor and process-group
cleanup require a Unix-like environment.

Run the isolated process and HTTP regression checks with:

```bash
npm run test:dev-controls
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