import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@emotion/react';
import { RouterProvider } from 'react-router-dom';
import { store } from './store/store';
import { router } from './router';
import { theme } from './styles/theme';
import { AudioProvider } from './features/audio/AudioContext';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { PWAManager, OfflineBanner } from './components/pwa/PWAManager';
import { initializeStorage } from './services/storage/storageInitializer';
import { setupStorageSync } from './store/persistenceMiddleware';
import { registerPWA } from './services/pwaService';
import './index.css';

// Initialize the enhanced storage system with server-side support
initializeStorage({
  enableRemoteStorage: true
}).catch(error => {
  console.warn('Storage initialization failed, falling back to local storage:', error);
});

// Load debug helpers in development
if (process.env.NODE_ENV === 'development') {
  import('./utils/debugHelpers');
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
          </AudioProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
