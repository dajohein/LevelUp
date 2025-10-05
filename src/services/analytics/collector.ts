/**
 * Analytics Event Collector
 * Real-time event collection with intelligent buffering and offline support
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  IAnalyticsCollector, 
  AnalyticsEvent, 
  AnalyticsEventType,
  AnalyticsError,
  AnalyticsErrorType,
  AnalyticsConfig 
} from './interfaces';
import { EnhancedStorageService } from '../storage/enhancedStorage';
import { logger } from '../logger';

export class AnalyticsCollector implements IAnalyticsCollector {
  private eventBuffer: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushTimer?: NodeJS.Timeout;
  private isOnline: boolean = navigator.onLine;
  private pendingEvents: AnalyticsEvent[] = [];
  
  constructor(
    private config: AnalyticsConfig,
    private storage: EnhancedStorageService
  ) {
    this.sessionId = uuidv4();
    this.setupEventListeners();
    this.startFlushTimer();
    this.loadPendingEvents();
  }

  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const fullEvent: AnalyticsEvent = {
        ...event,
        id: uuidv4(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        metadata: {
          version: '2.0.0',
          platform: this.detectPlatform(),
          userAgent: navigator.userAgent,
          ...event.metadata
        }
      };

      // Add to buffer
      this.eventBuffer.push(fullEvent);
      
      // Track specific event metrics
      await this.trackEventMetrics(fullEvent);

      // Flush if buffer is full or critical event
      if (this.shouldFlushImmediately(fullEvent)) {
        await this.flush();
      }

      logger.debug('Analytics event tracked', { eventId: fullEvent.id, type: fullEvent.type });
    } catch (error) {
      this.handleError(AnalyticsErrorType.COLLECTION_FAILED, error, { event });
    }
  }

  async trackMetric(metric: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    await this.trackEvent({
      type: AnalyticsEventType.RESPONSE_TIME, // Generic metric type
      sessionId: this.sessionId,
      data: {
        metric,
        value,
        tags,
        unit: this.inferUnit(metric)
      }
    });
  }

  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const eventsToFlush = [...this.eventBuffer];
      this.eventBuffer = [];

      if (this.isOnline) {
        // Process events immediately
        await this.processEvents(eventsToFlush);
      } else {
        // Store for later processing
        this.pendingEvents.push(...eventsToFlush);
        await this.savePendingEvents();
      }

      logger.info('Analytics events flushed', { count: eventsToFlush.length });
    } catch (error) {
      this.handleError(AnalyticsErrorType.COLLECTION_FAILED, error, { 
        bufferSize: this.eventBuffer.length 
      });
    }
  }

  // Real-time event processing
  private async processEvents(events: AnalyticsEvent[]): Promise<void> {
    // Store events for analytics processing
    await this.storage.saveAnalyticsEvents(this.eventBuffer);    // Trigger real-time metrics calculation
    if (this.config.realTimeUpdates) {
      await this.updateRealTimeMetrics(events);
    }

    // Background processing for patterns and predictions
    if (this.config.performance.backgroundProcessing) {
      this.scheduleBackgroundProcessing(events);
    }
  }

  // Real-time metrics updates
  private async updateRealTimeMetrics(events: AnalyticsEvent[]): Promise<void> {
    try {
      const sessionEvents = await this.getSessionEvents();
      const allEvents = [...sessionEvents, ...events];
      
      // Calculate and store updated metrics
      const metrics = this.calculateSessionMetrics(allEvents);
      await this.storage.saveRealtimeMetrics(this.sessionId, metrics);
      
      // Emit metrics update event
      this.emitMetricsUpdate(metrics);
    } catch (error) {
      logger.error('Failed to update real-time metrics', error);
    }
  }

  // Session metrics calculation
  private calculateSessionMetrics(events: AnalyticsEvent[]) {
    const sessionStart = events.find(e => e.type === AnalyticsEventType.SESSION_START);
    const sessionEnd = events.find(e => e.type === AnalyticsEventType.SESSION_END);
    
    const wordAttempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT);
    const wordSuccesses = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS);
    const hintsUsed = events.filter(e => e.type === AnalyticsEventType.HINT_USED);
    const pauses = events.filter(e => e.type === AnalyticsEventType.PAUSE_SESSION);
    
    const duration = sessionEnd ? 
      sessionEnd.timestamp - (sessionStart?.timestamp || events[0]?.timestamp || 0) : 
      Date.now() - (sessionStart?.timestamp || events[0]?.timestamp || 0);

    return {
      duration,
      wordsAttempted: wordAttempts.length,
      wordsCompleted: wordSuccesses.length,
      accuracy: wordAttempts.length > 0 ? wordSuccesses.length / wordAttempts.length : 0,
      streakCount: this.calculateCurrentStreak(events),
      pauseCount: pauses.length,
      hintsUsed: hintsUsed.length,
      lastUpdated: Date.now()
    };
  }

  // Streak calculation
  private calculateCurrentStreak(events: AnalyticsEvent[]): number {
    const wordEvents = events
      .filter(e => [AnalyticsEventType.WORD_SUCCESS, AnalyticsEventType.WORD_FAILURE].includes(e.type))
      .sort((a, b) => b.timestamp - a.timestamp);

    let streak = 0;
    for (const event of wordEvents) {
      if (event.type === AnalyticsEventType.WORD_SUCCESS) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  // Event metrics tracking
  private async trackEventMetrics(event: AnalyticsEvent): Promise<void> {
    const metrics = await this.storage.loadRealtimeMetrics(this.sessionId) || {
      accuracy: 0,
      responseTime: 0,
      streakCount: 0,
      hintsUsed: 0,
      totalEvents: 0
    };    // Update event counts
    metrics.eventCounts[event.type] = (metrics.eventCounts[event.type] || 0) + 1;

    // Track response times for certain events
    if (event.data.responseTime) {
      metrics.responseTimings.push({
        type: event.type,
        time: event.data.responseTime,
        timestamp: event.timestamp
      });
    }

    await this.storage.saveRealtimeMetrics(this.sessionId, metrics);
  }

  // Background processing scheduling
  private scheduleBackgroundProcessing(events: AnalyticsEvent[]): void {
    // Use requestIdleCallback for non-critical processing
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.performBackgroundAnalysis(events);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.performBackgroundAnalysis(events);
      }, 100);
    }
  }

  private async performBackgroundAnalysis(events: AnalyticsEvent[]): Promise<void> {
    try {
      // Detect patterns in recent events
      const patterns = await this.detectEventPatterns(events);
      if (patterns.length > 0) {
        await this.storage.saveAnalyticsEvents(patterns);
      }

      // Update learning predictions
      await this.updatePredictions(events);
    } catch (error) {
      logger.warn('Background analysis failed', error);
    }
  }

  // Simple pattern detection
  private async detectEventPatterns(events: AnalyticsEvent[]): Promise<any[]> {
    const patterns = [];
    
    // Detect rapid failure pattern
    const recentFailures = events
      .filter(e => e.type === AnalyticsEventType.WORD_FAILURE)
      .filter(e => Date.now() - e.timestamp < 30000); // Last 30 seconds
    
    if (recentFailures.length >= 3) {
      patterns.push({
        type: 'rapid_failures',
        confidence: 0.8,
        events: recentFailures.length,
        suggestion: 'Consider reducing difficulty or taking a break'
      });
    }

    // Detect hint dependency
    const recentHints = events
      .filter(e => e.type === AnalyticsEventType.HINT_USED)
      .filter(e => Date.now() - e.timestamp < 60000); // Last minute
    
    if (recentHints.length >= 2) {
      patterns.push({
        type: 'hint_dependency',
        confidence: 0.7,
        events: recentHints.length,
        suggestion: 'Review fundamental concepts for this topic'
      });
    }

    return patterns;
  }

  // Prediction updates
  private async updatePredictions(events: AnalyticsEvent[]): Promise<void> {
    // Simple prediction: session success likelihood
    const sessionEvents = await this.getSessionEvents();
    const allEvents = [...sessionEvents, ...events];
    
    const accuracy = this.calculateSessionMetrics(allEvents).accuracy;
    const successLikelihood = Math.min(accuracy * 1.2, 1.0); // Slight optimism bias
    
    await this.storage.saveAnalyticsEvents([{
      type: 'prediction_generated' as any,
      sessionId: this.sessionId,
      data: {
        sessionSuccessLikelihood: successLikelihood,
        calculatedAt: Date.now(),
        basedOnEvents: allEvents.length
      },
      timestamp: Date.now()
    }]);
  }

  // Utility methods
  private shouldFlushImmediately(event: AnalyticsEvent): boolean {
    const criticalEvents = [
      AnalyticsEventType.SESSION_END,
      AnalyticsEventType.LEVEL_UP,
      AnalyticsEventType.ACHIEVEMENT_UNLOCKED
    ];
    
    return criticalEvents.includes(event.type) || 
           this.eventBuffer.length >= this.config.batchSize;
  }

  private detectPlatform(): string {
    if (typeof window !== 'undefined') {
      if (/Android/i.test(navigator.userAgent)) return 'android';
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return 'ios';
      if (/Windows/i.test(navigator.userAgent)) return 'windows';
      if (/Mac/i.test(navigator.userAgent)) return 'mac';
      if (/Linux/i.test(navigator.userAgent)) return 'linux';
    }
    return 'web';
  }

  private inferUnit(metric: string): string {
    if (metric.includes('time') || metric.includes('duration')) return 'ms';
    if (metric.includes('rate') || metric.includes('percentage')) return '%';
    if (metric.includes('count') || metric.includes('number')) return 'count';
    return 'value';
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingEvents();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page visibility for session tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent({
          type: AnalyticsEventType.PAUSE_SESSION,
          sessionId: this.sessionId,
          data: { reason: 'page_hidden' }
        });
      } else {
        this.trackEvent({
          type: AnalyticsEventType.RESUME_SESSION,
          sessionId: this.sessionId,
          data: { reason: 'page_visible' }
        });
      }
    });

    // Beforeunload for final flush
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  private startFlushTimer(): void {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  private async getSessionEvents(): Promise<AnalyticsEvent[]> {
    const events = await this.storage.loadAnalyticsEvents({ sessionId: this.sessionId }) || [];
    return Array.isArray(events) ? events : [];
  }

  private async savePendingEvents(): Promise<void> {
    await this.storage.saveAnalyticsEvents(this.pendingEvents);
  }

  private async loadPendingEvents(): Promise<void> {
    const pending = await this.storage.loadAnalyticsEvents({ type: 'pending' }) || [];
    this.pendingEvents = Array.isArray(pending) ? pending : [];
  }

  private async processPendingEvents(): Promise<void> {
    if (this.pendingEvents.length > 0) {
      const eventsToProcess = [...this.pendingEvents];
      this.pendingEvents = [];
      await this.processEvents(eventsToProcess);
      // Clear pending events (in a real implementation, we'd have a delete method)
      this.pendingEvents = [];
    }
  }

  private emitMetricsUpdate(metrics: any): void {
    // Emit custom event for real-time UI updates
    const event = new CustomEvent('analytics:metricsUpdate', {
      detail: { metrics, sessionId: this.sessionId }
    });
    window.dispatchEvent(event);
  }

  private handleError(type: AnalyticsErrorType, error: any, context?: Record<string, any>): void {
    const analyticsError: AnalyticsError = {
      name: 'AnalyticsError',
      message: error.message || 'Unknown analytics error',
      type,
      context,
      recoverable: type !== AnalyticsErrorType.INVALID_DATA
    };

    logger.error('Analytics error', analyticsError);
    
    // Store error for later analysis
    this.storage.saveAnalyticsEvents([{
      type: 'analytics_error' as any,
      sessionId: this.sessionId,
      data: { error: analyticsError },
      timestamp: Date.now()
    }]).catch(() => {
      // Silent fail for error storage
    });
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}