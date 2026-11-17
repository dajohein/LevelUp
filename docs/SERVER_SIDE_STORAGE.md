# Remote Storage Status

The remote API (`api/users.ts`, `api/storage.ts`) is backed by Upstash Redis (Vercel Marketplace) in production and by an in-memory stand-in only in development and tests. It is **opt-in**: the client uses it only when `VITE_ENABLE_REMOTE_STORAGE=true` was set at build time (a Vite variable, baked into the bundle). Learning progress remains local to each device and `localStorage` is the source of truth. Nothing is mirrored to the server yet: the app creates a guest session and can link devices, but the remote storage tier is disabled. Account linking identifies the account on another device but does not yet transfer or reconcile progress between devices.

## Sessions

- Sessions are stateless HMAC-signed tokens (`SESSION_SECRET`); there is no server-side session table and no revocation.
- A token lives `SESSION_TOKEN_TTL_MS` (default 24 hours). `authenticate` is the only action that also accepts a validly signed token that expired up to `SESSION_REFRESH_GRACE_MS` ago (default 30 days, capped at 90) and returns a fresh token; the client stores it, so an active or briefly absent client never loses its session. Every other action requires an unexpired token. Forged, tampered or unsigned tokens are never accepted, and a token missing a valid user id or a finite whole-number expiry is rejected.
- A session has an **absolute age** (`SESSION_MAX_AGE_MS`, default 90 days), signed into every token as `a`. A refresh issues a new expiry but inherits `a` and never extends it, so refreshing cannot keep a session (or a stolen token) alive forever; once `a` has passed, every action refuses the token. Tokens issued before this existed are granted one full window the first time they are refreshed.
- `authenticate` answers a missing user exactly like a bad token (401), so it does not reveal which user ids exist.
- If the server refuses the stored token (expired beyond the grace period, a leftover from the earlier demo API, or the account is gone) the client raises `RemoteSessionError`. Only an explicit refusal counts (401, or 404 for a deleted account): a network failure raises `RemoteNetworkError`, and a 400 is a malformed request, neither of which suggests a reset. A page that stays open longer than a token lives refreshes it transparently: on a 401 the client exchanges the token through `authenticate` once and retries the same request (concurrent calls share one refresh, and a 401 that survives a fresh token is reported, not looped on). After a refusal the client stops asking on every storage call until the user resets. The session is **not** replaced automatically, because replacing a linked account's session would orphan its remote data. The device-linking screen explains this and offers "Reset sync session and try again", which discards only the stored sync session (`remoteStorage.resetSession()`); local progress is never touched.

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
4. **Remote Storage** (opt-in) - Upstash Redis behind `api/`; enabled with `VITE_ENABLE_REMOTE_STORAGE`

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
- `VITE_ENABLE_REMOTE_STORAGE` — Opt in to remote sync; requires the API to be backed by Redis (default: `false`)
- `VITE_ENABLE_LOCAL_FALLBACK` — Keep local tiers as fallback
- `VITE_DEBUG_MODE` — Enable verbose logging in development
- `VITE_STORAGE_ENDPOINT_STORAGE`, `VITE_STORAGE_ENDPOINT_USERS` — Endpoint paths

**Serverless APIs (Vercel):**

- `CORS_ALLOWED_ORIGINS` — Comma-separated origins (use `*` for all)
- `SESSION_TOKEN_TTL_MS` — Session token TTL in milliseconds (default 24 h)
- `SESSION_REFRESH_GRACE_MS` — How long after expiry a signed token can still be refreshed (default 30 days, maximum 90)
- `SESSION_MAX_AGE_MS` — Absolute lifetime of a session however often it is refreshed (default 90 days)
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

Remote sync is opt-in: set `VITE_ENABLE_REMOTE_STORAGE=true` at build time. The API is Redis-backed in production, but the app does not upload or restore learning progress yet (the remote tier is disabled in `tieredStorage`), so do not treat it as a backup or as cross-device sync.

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
- Local progress remains available; a refused stored session is reported (`RemoteSessionError`) and is replaced only when the user chooses "Reset sync session" on the device-linking screen

**"CORS errors in development"**

- Development server includes CORS headers
- Make sure you're using the correct ports

**"Data not syncing"**

- Cross-device progress transfer is not implemented: device linking identifies the account but does not copy or merge progress
- Progress is mirrored to the server only when remote sync is enabled; treat the browser's local storage as the source of truth

## 🔒 Security & Privacy

### Data Isolation

- Each language's data is completely separate
- User sessions are isolated by unique IDs
- No cross-contamination between languages or users

### Guest Accounts

- The first remote call creates a guest account and stores its session in `localStorage` (`levelup_remote_session`)
- An invalid stored session is reported instead of silently creating a replacement account (see Sessions above)

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
3. Does not automatically upload or migrate it to the remote API
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
