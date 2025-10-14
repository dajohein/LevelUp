/**
 * AI Challenge Configuration
 * 
 * Centralized configuration for AI enhancements in challenge modes
 */

export interface AIChallengConfig {
  enabled: boolean;
  cognitiveLoadThreshold: number; // 0-1, when to trigger interventions
  adaptationSensitivity: number; // 0-1, how quickly to adapt
  fallbackBehavior: 'graceful' | 'disable'; // How to handle AI failures
  performanceTracking: boolean; // Track AI vs non-AI performance
  debugLogging: boolean; // Enable detailed AI decision logging
}

const DEFAULT_CONFIG: AIChallengConfig = {
  enabled: true,
  cognitiveLoadThreshold: 0.7, // Trigger interventions when 70% cognitive load
  adaptationSensitivity: 0.6, // Moderate adaptation speed
  fallbackBehavior: 'graceful', // Always fall back to baseline
  performanceTracking: true, // Track performance metrics
  debugLogging: false // Disable debug logging in production
};

class AIConfigManager {
  private config: AIChallengConfig = { ...DEFAULT_CONFIG };

  /**
   * Get current AI configuration
   */
  getConfig(): AIChallengConfig {
    return { ...this.config };
  }

  /**
   * Update AI configuration
   */
  updateConfig(updates: Partial<AIChallengConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update the challenge AI integrator
    import('./challengeAIIntegrator').then(({ challengeAIIntegrator }) => {
      challengeAIIntegrator.setAIEnabled(this.config.enabled);
    });

    console.log('🤖 AI Challenge config updated:', this.config);
  }

  /**
   * Enable/disable AI features globally
   */
  setAIEnabled(enabled: boolean): void {
    this.updateConfig({ enabled });
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    
    import('./challengeAIIntegrator').then(({ challengeAIIntegrator }) => {
      challengeAIIntegrator.setAIEnabled(this.config.enabled);
    });

    console.log('🔄 AI Challenge config reset to defaults');
  }

  /**
   * Get performance comparison metrics
   */
  getPerformanceMetrics(): {
    aiEnhanced: { sessions: number; avgAccuracy: number; avgTime: number };
    baseline: { sessions: number; avgAccuracy: number; avgTime: number };
    improvement: { accuracy: number; time: number };
  } {
    // This would be implemented with actual performance tracking
    // For now, return placeholder data
    return {
      aiEnhanced: { sessions: 0, avgAccuracy: 0, avgTime: 0 },
      baseline: { sessions: 0, avgAccuracy: 0, avgTime: 0 },
      improvement: { accuracy: 0, time: 0 }
    };
  }

  /**
   * Check if AI features are available and enabled
   */
  isAIAvailable(): boolean {
    return this.config.enabled;
  }

  /**
   * Get fallback behavior setting
   */
  getFallbackBehavior(): 'graceful' | 'disable' {
    return this.config.fallbackBehavior;
  }

  /**
   * Check if debug logging is enabled
   */
  isDebugLoggingEnabled(): boolean {
    return this.config.debugLogging;
  }
}

// Export singleton instance
export const aiConfigManager = new AIConfigManager();