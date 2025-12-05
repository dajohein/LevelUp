/**
 * Test Utility for Environment Mode Detection
 *
 * Tests that development features are properly hidden in production
 */

import { isDevelopment, isProduction } from '../config/environment';

export function testEnvironmentMode() {
  console.log('🔍 Environment Mode Test');
  console.log('========================');
  console.log(`Current hostname: ${window.location.hostname}`);
  console.log(`isDevelopment: ${isDevelopment}`);
  console.log(`isProduction: ${isProduction}`);

  // Log expected behavior
  if (isDevelopment) {
    console.log('✅ Development mode detected - Development features should be visible');
  } else {
    console.log('🚫 Production mode detected - Development features should be hidden');
  }

  return {
    isDevelopment,
    isProduction,
    hostname: window.location.hostname,
    shouldShowDevFeatures: isDevelopment,
  };
}

// Auto-run in development
if (isDevelopment) {
  console.log('🧪 Running environment mode test...');
  testEnvironmentMode();
}
