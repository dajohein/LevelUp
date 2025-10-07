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

View real-time server logs:
```bash
tail -f logs/storage.log    # API server logs
tail -f logs/vite.log       # Vite development server logs
```

### Environment Configuration

The system automatically detects the environment and configures API endpoints:

**Development Environment:**
- **GitHub Codespaces**: Uses Vite proxy (http://localhost:5173/api/*)
- **Local Machine**: Uses direct API connection (http://localhost:3001/api/*)
- **Automatic Detection**: Based on hostname and environment variables
- **Debug Mode**: Enabled with comprehensive logging
- **Fallback**: Local storage if API server unavailable

**Production Environment:**
- **Vercel Deployment**: Uses serverless functions at current domain
- **Optimized Performance**: Minimal logging, optimistic updates
- **Graceful Degradation**: Falls back to local storage during outages

**Production:**
- Uses your Vercel domain for API calls  
- Optimized for performance
- Maintains offline capabilities

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

### Environment Variables (Optional)
Set these in your Vercel dashboard if needed:

```bash
VITE_API_URL=https://your-custom-domain.com  # Override API URL
```

## 🔧 Configuration

### Environment-based Settings
Located in `src/config/environment.ts`:

```typescript
// Development
{
  apiBaseUrl: 'http://localhost:3001',
  enableRemoteStorage: true,
  enableLocalFallback: true,
  debugMode: true
}

// Production  
{
  apiBaseUrl: window.location.origin,
  enableRemoteStorage: true,
  enableLocalFallback: true,
  debugMode: false
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
# Real-time API logs
tail -f logs/storage.log

# Real-time web server logs  
tail -f logs/vite.log

# Search for errors
grep -i error logs/*.log
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