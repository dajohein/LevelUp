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
import { initializeStorage } from './services/storageService';
import { setupStorageSync } from './store/persistenceMiddleware';
import './index.css';

// Initialize the storage system
initializeStorage();

// Setup cross-tab synchronization
setupStorageSync(store);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <AudioProvider>
            <RouterProvider router={router} />
          </AudioProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
