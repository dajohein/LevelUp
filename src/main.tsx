import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@emotion/react';
import { RouterProvider } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { store } from './store/store';
import { router } from './router';
import { theme } from './styles/theme';
import { AudioProvider } from './features/audio/AudioContext';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { PWAManager, OfflineBanner } from './components/pwa/PWAManager';
import { initializeStorage } from './services/storage/storageInitializer';
import { setupStorageSync } from './store/persistenceMiddleware';
import { registerPWA } from './services/pwaService';
import { developmentCacheManager } from './utils/developmentCacheManager';
import { environmentConfig } from './config/environment';
import { logger } from './services/logger';
import './utils/developerToolsDashboard'; // Initialize developer tools globally
import './index.css';

// Initialize the enhanced storage system with server-side support
initializeStorage({
  enableRemoteStorage: true,
}).catch(error => {
  logger.warn('Storage initialization failed, falling back to local storage', { error });
});

// Initialize development cache busting
if (environmentConfig.cacheBusting.enabled) {
  // Update cache manager with environment-specific config
  developmentCacheManager.updateConfig(environmentConfig.cacheBusting);
  console.log('🧹 Development cache busting enabled');
  console.log('   • Use Ctrl+Shift+R to clear app caches and reload');
  console.log('   • Use Ctrl+Shift+C to clear app caches only');
  console.log('   • User data and progress are always preserved');
}

// Load debug helpers in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/debugHelpers');
  import('./utils/debugPerformanceHelper');
  import('./utils/testPerformanceFix');
}

// Setup cross-tab synchronization
setupStorageSync(store);

// Register PWA service worker
registerPWA();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <AudioProvider>
            <OfflineBanner />
            <RouterProvider router={router} />
            <PWAManager />
            <SpeedInsights />
          </AudioProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
