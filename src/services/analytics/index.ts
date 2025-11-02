/**
 * Phase 2: Analytics Enhancement - Main Export
 * 
 * Enhanced analytics system with predictive capabilities
 * Built on Phase 1 enhanced storage foundation
 */

// Main Analytics Service
export { EnhancedAnalyticsService } from './enhancedAnalytics';
import { EnhancedAnalyticsService } from './enhancedAnalytics';

// Core Services
export { AnalyticsCollector } from './collector';
export { MetricsCalculator } from './metricsCalculator';
export { PatternRecognizer } from './patternRecognizer';
export { PredictiveAnalytics } from './predictiveAnalytics';

// Interfaces and Types
export * from './interfaces';

// Default Configuration
export const DEFAULT_ANALYTICS_CONFIG = {
  enabled: true,
  realTimeUpdates: true,
  batchSize: 50,
  flushInterval: 5000,      // 5 seconds
  retentionDays: 90,
  anonymizeData: true,
  enablePredictions: true,
  patternDetection: {
    enabled: true,
    sensitivity: 0.7,
    minConfidence: 0.6,
  },
  performance: {
    maxEventsInMemory: 1000,
    compressionEnabled: true,
    backgroundProcessing: true,
  },
};

/**
 * Initialize Enhanced Analytics
 * 
 * @param storage Enhanced storage service instance
 * @param config Optional configuration overrides
 * @returns Configured analytics service
 */
export function createAnalyticsService(
  storage: any, 
  config: Partial<typeof DEFAULT_ANALYTICS_CONFIG> = {}
) {
  const finalConfig = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  // Use imported EnhancedAnalyticsService
  return new EnhancedAnalyticsService(storage, finalConfig);
}

/**
 * Phase 2 Features Summary:
 * 
 * ✅ Real-time Analytics Collection
 * ✅ Behavioral Pattern Recognition  
 * ✅ Predictive Learning Analytics
 * ✅ Performance Optimization Recommendations
 * ✅ Intelligent Caching & Storage
 * ✅ Backend-Ready Architecture
 * ✅ Comprehensive Error Handling
 * ✅ Automated Model Training
 * ✅ Learning Path Optimization
 * ✅ Advanced Metrics Calculation
 */