// Vite environment variable typings
// Ensures typed access to import.meta.env across the app

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_REMOTE_STORAGE?: string; // 'true' | 'false'
  readonly VITE_ENABLE_LOCAL_FALLBACK?: string; // 'true' | 'false'
  readonly VITE_DEBUG_MODE?: string; // 'true' | 'false'

  readonly VITE_STORAGE_ENDPOINT_STORAGE?: string; // e.g. '/api/storage'
  readonly VITE_STORAGE_ENDPOINT_USERS?: string; // e.g. '/api/users'

  // Cache busting toggles
  readonly VITE_CACHE_ENABLED?: string; // 'true' | 'false'
  readonly VITE_CACHE_AUTO_CLEAN_ON_START?: string; // 'true' | 'false'
  readonly VITE_CACHE_CLEAR_SW?: string; // 'true' | 'false'
  readonly VITE_CACHE_CLEAR_APP?: string; // 'true' | 'false'
  readonly VITE_CACHE_CLEAR_STORAGE?: string; // 'true' | 'false'
  readonly VITE_CACHE_ADD_TIMESTAMP?: string; // 'true' | 'false'
  readonly VITE_CACHE_LOG_OPERATIONS?: string; // 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
