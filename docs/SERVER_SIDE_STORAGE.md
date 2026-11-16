# Remote Storage Status and Development Demo

The current remote API is a development/demo implementation, not a durable storage service. Its user, session, account-code, and progress records live in process-local Maps, so they can disappear on a restart and are not shared reliably across serverless instances. Production remote account and storage requests are disabled. Learning progress remains local to each device; account linking does not transfer or reconcile progress.

## 🌟 Features

- **Local-first progress**: Browser progress remains available on the current device
- **Development demo**: Remote endpoints can be explicitly enabled for local testing only
- **Language isolation**: Each language's data is stored separately
- **Development testing**: Local development server for testing
- **Production safety**: Volatile remote endpoints return HTTP 503 in production

## 🏗️ Architecture

### Storage Tiers

1. **Memory Cache** (fastest) - Recent data
2. **localStorage** (fast) - Browser storage
3. **IndexedDB** (medium) - Large browser storage
4. **Remote Storage** (development demo only) - Process-local API storage; not persistent or production-enabled

### API Endpoints

- `POST /api/storage` - Data operations (get/set/delete/list)
- `POST /api/users` - User session management

Integration tests (local handlers via stubbed `fetch`):

- [src/services/storage/**tests**/remoteStorage.integration.test.ts](../src/services/storage/__tests__/remoteStorage.integration.test.ts)

## 🚀 Development Setup

### Quick Start (Recommended)

**Start the complete development environment:**

```bash
npm run dev:start    # Starts both API and web servers as background services
```

**Check system health:**

```bash
npm run health:storage    # Verify the proxied API health endpoint
```

**Access your application:**

- **Web App**: http://localhost:5173
- **API Health**: http://localhost:5173/api/health
- **API Status**: http://localhost:5173/api/status
- **Debug Panel**: Press `Ctrl+Shift+S` in the web app

**Stop development environment:**

```bash
npm run dev:stop    # Stops services managed by this checkout
```

Startup fails on occupied ports or unhealthy services and cleans up only its
own processes. For alternate ports and recovery instructions, see
[development server controls](../scripts/README.md).

### Alternative Development Commands

**Individual services:**

```bash
npm run dev:storage    # API server only (port 3001)
npm run dev           # Web app only (port 5173)
npm run dev:full      # Both servers in foreground
```

**Server management:**

```bash
npm run dev:restart   # Restart entire development environment
npm run test:storage  # Test storage endpoints
```

### Development Logs

**Twelve-Factor Logging (Default):**
Logs stream to stdout for easy aggregation and debugging:

```bash
npm run dev:start    # Logs appear in terminal
```

**File-based Logging (Optional):**
Write logs to disk for review:

```bash
./scripts/dev-start.sh --log-files
tail -f logs/storage.log    # API server logs
tail -f logs/vite.log       # Vite development server logs
```

### Environment Configuration (Env-First)

Configuration is controlled via environment variables to follow Twelve-Factor principles. See `.env.example` for a full list.

**Frontend (Vite):**

- `VITE_API_BASE_URL` — Base URL for API calls (defaults to browser origin)
- `VITE_ENABLE_REMOTE_STORAGE` — Opt in to the volatile remote demo in development only (default: `false`)
- `VITE_ENABLE_LOCAL_FALLBACK` — Keep local tiers as fallback
- `VITE_DEBUG_MODE` — Enable verbose logging in development
- `VITE_STORAGE_ENDPOINT_STORAGE`, `VITE_STORAGE_ENDPOINT_USERS` — Endpoint paths

**Serverless APIs (Vercel):**

- `CORS_ALLOWED_ORIGINS` — Comma-separated origins (use `*` for all)
- `SESSION_TOKEN_TTL_MS` — Session token TTL in milliseconds
- `RATE_LIMIT_MAX_ATTEMPTS`, `RATE_LIMIT_WINDOW_MS` — Rate limit controls
- `ACCOUNT_CODE_MAX_ATTEMPTS`, `ACCOUNT_CODE_EXPIRY_MS` — Device linking code policy

Set frontend variables in `.env` locally and in Vercel’s Project Settings for production. Server-side variables should be set only in Vercel.

## 📚 Usage Examples

### Local-First Usage

The storage system initializes automatically and keeps remote storage disabled by default:

```typescript
// Automatically initializes in main.tsx
import { initializeStorage } from './services/storage/storageInitializer';

await initializeStorage();
```

For local API experiments only, set `VITE_ENABLE_REMOTE_STORAGE=true`. The demo API is process-local, can lose data on restart, does not replicate between workers, and must not be used for learning-progress backups or production sync. Production requests are rejected even if the frontend option is set.

### Manual Storage Operations

```typescript
import { enhancedStorage } from './services/storage/enhancedStorage';

// Save word progress locally
await enhancedStorage.saveWordProgress('de', {
  hello: {
    word: 'hello',
    correctCount: 5,
    incorrectCount: 1,
    lastSeen: Date.now(),
    proficiencyLevel: 'intermediate',
  },
});

// Load word progress from local storage
const result = await enhancedStorage.loadWordProgress('de');
if (result.success) {
  console.log('Local progress loaded:', result.data);
}
```

### Check Storage Status

```typescript
import { getStorageStatus } from './services/storage/storageInitializer';

const status = await getStorageStatus();
console.log('Remote storage enabled:', status.remoteEnabled);
console.log('System initialized:', status.initialized);
```

## 🌐 Deployment

### Vercel Deployment (Automatic)

The system is configured to work automatically on Vercel:

1. **API Functions**: `api/storage.ts` and `api/users.ts` become serverless functions
2. **Frontend**: Static files served from `dist/`
3. **Configuration**: `vercel.json` handles routing

### Environment Variables (Quick Setup)

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

Local-first defaults:

```dotenv
VITE_API_BASE_URL=http://localhost:5173
VITE_ENABLE_REMOTE_STORAGE=false
VITE_ENABLE_LOCAL_FALLBACK=true
VITE_DEBUG_MODE=true
VITE_STORAGE_ENDPOINT_STORAGE=/api/storage
VITE_STORAGE_ENDPOINT_USERS=/api/users
```

On Vercel, set server-side variables (e.g., `CORS_ALLOWED_ORIGINS`) in the project settings.

## 🔧 Configuration

### Environment-based Settings

Located in `src/config/environment.ts` and driven by `import.meta.env`:

```typescript
const env = import.meta.env;
{
  apiBaseUrl: env.VITE_API_BASE_URL || window.location.origin,
  enableRemoteStorage: env.VITE_ENABLE_REMOTE_STORAGE === 'true',
  enableLocalFallback: env.VITE_ENABLE_LOCAL_FALLBACK === 'true',
  debugMode: env.VITE_DEBUG_MODE === 'true'
}
```

### Storage Tier Configuration

```typescript
{
  memory: { enabled: true, maxSize: '50MB', ttl: '1h' },
  local: { enabled: true, maxSize: '200MB', ttl: '24h' },
  indexedDB: { enabled: true, maxSize: '500MB', ttl: '7d' },
  remote: { enabled: true, maxSize: '1GB', ttl: '30d' }
}
```

## 🐛 Debugging

### Development Tools

1. **Storage Server Status**: `http://localhost:3001/api/status`
2. **Health Check**: `http://localhost:3001/api/health`
3. **Browser DevTools**: Check Network tab for API calls
4. **Console Logs**: Enabled in development mode

### Common Issues

**"Remote storage unavailable"**

- Check if development server is running (`npm run dev:storage`)
- Verify API endpoints are accessible
- Local progress remains available; failed remote recovery does not replace a stored remote session with a new guest

**"CORS errors in development"**

- Development server includes CORS headers
- Make sure you're using the correct ports

**"Data not syncing"**

- Remote sync and cross-device progress transfer are not implemented
- Device linking in development is a demo and does not copy or merge progress
- Do not use the process-local API as a backup

## 🔒 Security & Privacy

### Data Isolation

- Each language's data is completely separate
- User sessions are isolated by unique IDs
- No cross-contamination between languages or users

### Demo Accounts

- Development can create temporary guest sessions
- Process-local sessions may be lost on restart or a different serverless worker
- An invalid stored session is reported instead of silently creating a replacement account

### Data Storage

- **Development**: In-memory storage (resets on server restart)
- **Production**: Remote account and storage APIs return HTTP 503 until a durable backend is implemented
- All data is associated with language codes for isolation

## 📈 Performance

### Storage Analytics

The system provides detailed analytics:

```typescript
const analytics = await enhancedStorage.getStorageAnalytics();
console.log('Cache hit rate:', analytics.data.cache.hitRate);
console.log('Health score:', analytics.data.health.score);
```

### Optimization Features

- **Compression**: Large data is automatically compressed
- **Caching**: Intelligent multi-tier caching
- **Offline-first local storage**: Browser storage remains the source of progress when offline

## 🔄 Migration

### From Local-Only Storage

The system keeps browser progress local:

1. Detects existing local data
2. Preserves it in browser storage
3. Does not automatically upload or migrate it to the volatile demo API
4. Requires an explicit export/import to move data between devices

### Language Isolation Compliance

- ✅ Maintains strict language separation
- ✅ Compatible with existing storage patterns
- ✅ Zero breaking changes to existing code
- ✅ Follows all architectural constraints

## 🚧 Future Enhancements

### Planned Features

1. **Durable shared backend**: Select and implement persistent storage before enabling remote sync
2. **User Authentication**: Full user accounts with email/password
3. **Cross-device Notifications**: Progress notifications across devices
4. **Advanced Analytics**: Detailed learning analytics dashboard
5. **Backup & Export**: Data export and backup features

### Backend Options

The current implementation can be easily upgraded to:

- **PostgreSQL** (recommended for production)
- **MongoDB** (for document-based storage)
- **Redis** (for session management)
- **AWS/Azure** (for enterprise deployments)

## 🔧 Troubleshooting

### Common Issues

**❌ API endpoints return 404:**

```bash
# Check if storage server is running
npm run health:storage

# Restart development environment
npm run dev:restart
```

**❌ "Failed to fetch" errors:**

- Ensure both servers are running: `ps aux | grep -E "(vite|dev-storage)"`
- Check Vite proxy configuration in `vite.config.ts`
- Verify environment detection in browser console

**❌ Cross-language data mixing:**

- Check browser console for language validation logs
- Verify `languageCode` parameters in API calls
- Use debug panel (`Ctrl+Shift+S`) to inspect storage state

**❌ GitHub Codespaces port access:**

- Verify port 5173 is exposed and accessible
- Use Vite proxy URLs: `http://localhost:5173/api/*`
- Check Codespaces port forwarding settings

### Debug Tools

**Storage Debug Panel:**

```
Press Ctrl+Shift+S in the web app to open debug panel
- View storage tiers and health
- Test remote storage connection
- Monitor real-time analytics
```

**Command Line Health Checks:**

```bash
# Quick health check
npm run health:storage

# Detailed API status
curl http://localhost:5173/api/status | jq .

# Test storage operations
npm run test:storage
```

**Log Analysis:**

```bash
# Real-time logs (with --log-files flag)
tail -f logs/storage.log
tail -f logs/vite.log

# Search for errors (with --log-files flag)
grep -i error logs/*.log

# Default (stdout): use terminal scrollback or redirect
./scripts/dev-start.sh 2>&1 | tee dev-output.log
```

### Performance Monitoring

**Check storage health score (should be > 80):**

```javascript
// In browser console
const analytics = await enhancedStorage.getStorageAnalytics();
console.log('Health score:', analytics.data.health.score);
```

**Monitor cache performance (should be > 85% hit rate):**

```javascript
// In browser console
const stats = await enhancedStorage.getStorageAnalytics();
console.log('Cache hit rate:', stats.data.cache.hitRate);
```
