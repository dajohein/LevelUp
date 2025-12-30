# Server-Side Storage Implementation

This document describes the new server-side storage system for LevelUp, which provides cross-device sync and persistent data storage using Vercel serverless functions.

## 🌟 Features

- **Cross-device synchronization**: Your progress syncs across all your devices
- **Offline-first architecture**: Works offline, syncs when online
- **Language isolation**: Each language's data is stored separately
- **Automatic user sessions**: Creates guest accounts automatically
- **Development testing**: Local development server for testing
- **Zero-configuration deployment**: Works out-of-the-box on Vercel

## 🏗️ Architecture

### Storage Tiers
1. **Memory Cache** (fastest) - Recent data
2. **localStorage** (fast) - Browser storage
3. **IndexedDB** (medium) - Large browser storage
4. **Remote Storage** (persistent) - Server-side storage via API

### API Endpoints
- `POST /api/storage` - Data operations (get/set/delete/list)
- `POST /api/users` - User session management
 
Integration tests (local handlers via stubbed `fetch`):
- [src/services/storage/__tests__/remoteStorage.integration.test.ts](../src/services/storage/__tests__/remoteStorage.integration.test.ts)

## 🚀 Development Setup

### Quick Start (Recommended)

**Start the complete development environment:**
```bash
npm run dev:start    # Starts both API and web servers as background services
```

**Check system health:**
```bash
npm run health:storage    # Verify all endpoints are working
```

**Access your application:**
- **Web App**: http://localhost:5173
- **API Health**: http://localhost:5173/api/health  
- **API Status**: http://localhost:5173/api/status
- **Debug Panel**: Press `Ctrl+Shift+S` in the web app

**Stop development environment:**
```bash
npm run dev:stop    # Stops all background services
```

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
- `VITE_ENABLE_REMOTE_STORAGE` — Enable remote storage sync
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

### Basic Usage (Automatic)
The storage system initializes automatically when the app starts:

```typescript
// Automatically initializes in main.tsx
import { initializeStorage } from './services/storage/storageInitializer';

// Initialize with remote storage enabled
await initializeStorage({
  enableRemoteStorage: true
});
```

### Manual Storage Operations
```typescript
import { enhancedStorage } from './services/storage/enhancedStorage';

// Save word progress (automatically syncs to server)
await enhancedStorage.saveWordProgress('de', {
  'hello': {
    word: 'hello',
    correctCount: 5,
    incorrectCount: 1,
    lastSeen: Date.now(),
    proficiencyLevel: 'intermediate'
  }
});

// Load word progress (tries server first, falls back to local)
const result = await enhancedStorage.loadWordProgress('de');
if (result.success) {
  console.log('Progress loaded:', result.data);
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

Recommended local values:

```dotenv
VITE_API_BASE_URL=http://localhost:5173
VITE_ENABLE_REMOTE_STORAGE=true
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
- System will fall back to local storage

**"CORS errors in development"**
- Development server includes CORS headers
- Make sure you're using the correct ports

**"Data not syncing"**
- Check browser Network tab for failed API calls
- Verify you're online and server is reachable
- Data will sync when connection is restored

## 🔒 Security & Privacy

### Data Isolation
- Each language's data is completely separate
- User sessions are isolated by unique IDs
- No cross-contamination between languages or users

### Guest Accounts
- Users get automatic guest accounts
- No personal information required
- Sessions persist across browser restarts
- Can upgrade to full accounts later (future feature)

### Data Storage
- **Development**: In-memory storage (resets on server restart)
- **Production**: Can be easily upgraded to proper database
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
- **Batching**: Multiple operations are batched
- **Offline Queue**: Operations queue when offline, sync when online

## 🔄 Migration

### From Local-Only Storage
The system automatically:
1. Detects existing local data
2. Maintains local storage as fallback
3. Gradually migrates to server storage
4. Preserves all existing progress

### Language Isolation Compliance
- ✅ Maintains strict language separation
- ✅ Compatible with existing storage patterns
- ✅ Zero breaking changes to existing code
- ✅ Follows all architectural constraints

## 🚧 Future Enhancements

### Planned Features
1. **Database Integration**: Replace in-memory storage with PostgreSQL
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