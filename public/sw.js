// Service Worker for LevelUp PWA
// Implements offline functionality, caching, and background sync

// Dynamic cache versioning system
// This will be automatically updated during build process
const CACHE_VERSION = '2.0.0'; // Incremented for boss battle & streak challenge updates
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__'; // Replaced during build
const FEATURES_HASH = '__FEATURES_HASH__'; // Hash of recent features for cache invalidation

const isDevelopment = self.location.hostname === 'localhost' || 
                     self.location.hostname === '127.0.0.1' ||
                     self.location.hostname.includes('app.github.dev') ||
                     self.location.hostname.includes('gitpod.io') ||
                     self.location.hostname.includes('codespaces');

// Production: Use version + features hash for cache busting
// Development: Use timestamp for immediate cache invalidation
const cacheIdentifier = isDevelopment 
  ? Date.now().toString()
  : `${CACHE_VERSION}-${FEATURES_HASH}`;

const CACHE_NAME = `levelup-v${cacheIdentifier}`;
const OFFLINE_CACHE = `levelup-offline-v${cacheIdentifier}`;
const DATA_CACHE = `levelup-data-v${cacheIdentifier}`;

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other critical static resources
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/languages/,
  /\/api\/modules/,
  /\/api\/words/,
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install', isDevelopment ? '(Development Mode)' : '(Production Mode)');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static resources to:', CACHE_NAME);
        
        // In development, be more aggressive about cache busting
        if (isDevelopment) {
          console.log('[ServiceWorker] Development mode: cache busting enabled');
        }
        
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        // Force activation of new service worker
        console.log('[ServiceWorker] Skipping waiting for immediate activation');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches and force updates
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate', isDevelopment ? '(Development Mode)' : '(Production Mode)');
  console.log('[ServiceWorker] Cache identifier:', cacheIdentifier);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[ServiceWorker] Found caches:', cacheNames);
        console.log('[ServiceWorker] Current cache names:', { CACHE_NAME, OFFLINE_CACHE, DATA_CACHE });
        
        const currentCaches = [CACHE_NAME, OFFLINE_CACHE, DATA_CACHE];
        
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete any cache that doesn't match our current version
            if (cacheName.startsWith('levelup') && !currentCaches.includes(cacheName)) {
              console.log('[ServiceWorker] 🗑️ Removing outdated cache:', cacheName);
              return caches.delete(cacheName);
            } else if (currentCaches.includes(cacheName)) {
              console.log('[ServiceWorker] ✅ Keeping current cache:', cacheName);
              return Promise.resolve();
            } else {
              console.log('[ServiceWorker] 📦 Keeping non-LevelUp cache:', cacheName);
              return Promise.resolve();
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] 🚀 Taking control of all pages');
        // Take control of all pages immediately - forces update
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            console.log('[ServiceWorker] 📢 Notifying client of update');
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION,
              cacheIdentifier: cacheIdentifier
            });
          });
        });
      })
  );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] 🚀 Client requested immediate activation');
    // Skip waiting and take control immediately
    self.skipWaiting();
  }
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Development cache busting: bypass cache if _cacheBust parameter is present
  if (isDevelopment && url.searchParams.has('_cacheBust')) {
    console.log('[ServiceWorker] Cache busting detected, bypassing cache for:', url.pathname);
    event.respondWith(
      fetch(request).catch(() => {
        // Fallback to cache only if network fails
        return caches.match(request);
      })
    );
    return;
  }

  // Strategy 1: Cache First for static assets
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy 2: Network First for API calls with fallback
  if (isApiCall(request)) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Strategy 3: Stale While Revalidate for language data
  if (isLanguageData(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Strategy 4: Network First for navigation
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstForNavigation(request));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirst(request));
});

// Background sync for offline progress
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'progress-sync') {
    event.waitUntil(syncProgress());
  }
  
  if (event.tag === 'session-sync') {
    event.waitUntil(syncSessions());
  }
});

// Push notifications for learning reminders
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Time for your language practice!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'practice',
        title: 'Start Practice',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'later',
        title: 'Remind Later'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('LevelUp Language Learning', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event);
  
  event.notification.close();
  
  if (event.action === 'practice') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'later') {
    // Schedule reminder for later
    scheduleReminder(30 * 60 * 1000); // 30 minutes
  }
});

// Caching Strategies Implementation

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(DATA_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline fallback for API calls
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Some features may be limited.',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  
  // Start fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

async function networkFirstForNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Return offline page for navigation failures
    const cache = await caches.open(OFFLINE_CACHE);
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback to index.html for SPA routing
    const indexPage = await cache.match('/');
    return indexPage || new Response('Offline', { status: 503 });
  }
}

// Helper functions

function isApiCall(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

function isLanguageData(request) {
  return request.url.includes('/data/') && request.url.includes('.json');
}

async function syncProgress() {
  try {
    // Get offline progress from IndexedDB
    const offlineProgress = await getOfflineProgress();
    
    if (offlineProgress.length > 0) {
      // Send to server
      const response = await fetch('/api/sync/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineProgress)
      });
      
      if (response.ok) {
        // Clear offline progress
        await clearOfflineProgress();
        console.log('[ServiceWorker] Progress synced successfully');
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Progress sync failed:', error);
  }
}

async function syncSessions() {
  try {
    // Get offline sessions from IndexedDB
    const offlineSessions = await getOfflineSessions();
    
    if (offlineSessions.length > 0) {
      // Send to server
      const response = await fetch('/api/sync/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineSessions)
      });
      
      if (response.ok) {
        // Clear offline sessions
        await clearOfflineSessions();
        console.log('[ServiceWorker] Sessions synced successfully');
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Session sync failed:', error);
  }
}

function scheduleReminder(delay) {
  // Schedule a push notification reminder
  setTimeout(() => {
    self.registration.showNotification('LevelUp Reminder', {
      body: 'Ready to continue your language learning?',
      icon: '/icons/icon-192x192.png',
      tag: 'reminder'
    });
  }, delay);
}

// IndexedDB operations (simplified - should use a proper IndexedDB wrapper)
async function getOfflineProgress() {
  // This would interact with IndexedDB to get offline progress
  return [];
}

async function clearOfflineProgress() {
  // This would clear offline progress from IndexedDB
}

async function getOfflineSessions() {
  // This would get offline sessions from IndexedDB
  return [];
}

async function clearOfflineSessions() {
  // This would clear offline sessions from IndexedDB
}