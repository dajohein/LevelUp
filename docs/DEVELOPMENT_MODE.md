# Development Mode Features

## Overview
The LevelUp application includes development-only features that are automatically hidden in production. This ensures that experimental features and developer tools don't appear for end users.

## Environment Detection

The application automatically detects the environment based on the hostname:

- **Development Mode**: `localhost`, `127.0.0.1`, or GitHub Codespaces URLs
- **Production Mode**: Vercel deployments or custom domain names

```typescript
// src/config/environment.ts
export const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           isCodespaces;
```

## Development Features

When in development mode, the following additional features are available:

### 🧪 Development Features Section
Located on the main language selection page:

- **🤖 Simple AI Demo** (`/simple-ai-demo`) - Interactive AI learning demonstration
- **🎨 Component Library** (`/components-demo`) - UI component showcase
- **⏳ Loading States** (`/loading-demo`) - Loading state demonstrations

### Usage in Components

To conditionally show development features:

```typescript
import { isDevelopment } from '../config/environment';

export const MyComponent = () => {
  return (
    <div>
      {/* Regular content */}
      
      {isDevelopment && (
        <div>
          {/* Development-only features */}
        </div>
      )}
    </div>
  );
};
```

## Production Behavior

In production builds:
- Development features are completely hidden from the UI
- Debug logging is disabled
- Performance optimizations are enabled
- Remote storage endpoints are configured

## Testing

To test environment detection, check the browser console in development mode for automatic environment logging.

```typescript
// Test utility
import { testEnvironmentMode } from '../utils/testEnvironmentMode';
const result = testEnvironmentMode();
```

This ensures a clean, professional experience for end users while providing rich development tools for the development team.