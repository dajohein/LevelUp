import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import removeConsole from 'vite-plugin-remove-console';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Remove console.log in production builds (keep warn/error)
    removeConsole({
      includes: ['log', 'debug', 'info'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          vendor: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux'],
          router: ['react-router-dom'],
          ui: ['@emotion/react', '@emotion/styled']
        }
      }
    },
    // Report bundle size
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000
  },
  // Development server optimizations
  server: {
    hmr: {
      overlay: true
    },
    // Proxy API requests to the storage server
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});