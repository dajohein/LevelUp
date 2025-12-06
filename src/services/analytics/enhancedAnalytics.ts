/**
 * Enhanced Analytics Service
 * Main orchestration service for Phase 2 analytics system
 */

import {
  IAnalyticsCollector,
  IMetricsCalculator,
  IPatternRecognizer,
  IPredictiveAnalytics,
  AnalyticsEvent,
  AnalyticsEventType,
  PredictionType,
  RealTimeMetrics,
  LearningPattern,
  Prediction,
  AnalyticsConfig,
  AnalyticsReport,
  ReportType,
  PredictionContext,
  LearningRecommendation,
} from './interfaces';
import { AnalyticsCollector } from './collector';
import { MetricsCalculator } from './metricsCalculator';
import { PatternRecognizer } from './patternRecognizer';
import { PredictiveAnalytics } from './predictiveAnalytics';
import { EnhancedStorageService } from '../storage/enhancedStorage';
import { logger } from '../logger';

export class EnhancedAnalyticsService {
  private collector: IAnalyticsCollector;
  private metricsCalculator: IMetricsCalculator;
  private patternRecognizer: IPatternRecognizer;
  private predictiveAnalytics: IPredictiveAnalytics;
  private realTimeMetrics: RealTimeMetrics | null = null;
  private currentPatterns: LearningPattern[] = [];
  private updateInterval?: NodeJS.Timeout;
  private currentSessionId = `session_${Date.now()}`;

  constructor(
    private storage: EnhancedStorageService,
    private config: AnalyticsConfig
  ) {
    this.collector = new AnalyticsCollector(config, storage);
    this.metricsCalculator = new MetricsCalculator(storage);
    this.patternRecognizer = new PatternRecognizer(storage);
    this.predictiveAnalytics = new PredictiveAnalytics(storage);

    if (config.realTimeUpdates) {
      this.startRealTimeUpdates();
    }
  }

  private getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  // Public API Methods

  async trackEvent(
    type: AnalyticsEventType,
    data: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.collector.trackEvent({
      type,
      sessionId: this.getCurrentSessionId(),
      data,
      userId,
    });

    // Trigger real-time analysis for critical events
    if (this.isCriticalEvent(type)) {
      await this.performRealTimeAnalysis();
    }
  }

  async trackWordAttempt(
    word: string,
    success: boolean,
    responseTime: number,
    difficulty: number,
    topic?: string,
    userId?: string
  ): Promise<void> {
    // Track the attempt
    await this.trackEvent(
      AnalyticsEventType.WORD_ATTEMPT,
      {
        word,
        responseTime,
        difficulty,
        topic,
      },
      userId
    );

    // Track the result
    await this.trackEvent(
      success ? AnalyticsEventType.WORD_SUCCESS : AnalyticsEventType.WORD_FAILURE,
      {
        word,
        responseTime,
        difficulty,
        topic,
      },
      userId
    );
  }

  async trackSessionStart(userId?: string): Promise<void> {
    await this.trackEvent(
      AnalyticsEventType.SESSION_START,
      {
        startTime: Date.now(),
      },
      userId
    );
  }

  async trackSessionEnd(userId?: string): Promise<void> {
    await this.trackEvent(
      AnalyticsEventType.SESSION_END,
      {
        endTime: Date.now(),
      },
      userId
    );

    // Generate session summary
    await this.generateSessionSummary(userId);
  }

  async getCurrentMetrics(): Promise<RealTimeMetrics | null> {
    if (!this.realTimeMetrics) {
      await this.updateRealTimeMetrics();
    }
    return this.realTimeMetrics;
  }

  async getActivePatterns(): Promise<LearningPattern[]> {
    return this.currentPatterns;
  }

  async getPredictions(
    userId: string,
    context?: Partial<PredictionContext>
  ): Promise<Prediction[]> {
    const fullContext = await this.buildPredictionContext(userId, context);
    return this.predictiveAnalytics.generatePredictions(userId, fullContext);
  }

  async getLearningRecommendations(userId: string): Promise<LearningRecommendation[]> {
    const currentMetrics = await this.getCurrentMetrics();
    if (!currentMetrics) return [];

    return this.predictiveAnalytics.optimizeLearningPath(userId, currentMetrics.learningMetrics);
  }

  async generateReport(
    type: ReportType,
    period?: { start: number; end: number }
  ): Promise<AnalyticsReport> {
    const reportPeriod = period || this.getDefaultPeriod(type);
    const events = await this.getEventsForPeriod(reportPeriod);

    const summary = await this.generateAnalyticsSummary(events);
    const trends = await this.analyzeTrends(events);
    const insights = await this.generateInsights(events);
    const recommendations = await this.generateRecommendations(events);

    return {
      id: `report_${type}_${Date.now()}`,
      type,
      period: reportPeriod,
      data: {
        summary,
        trends,
        insights,
        recommendations,
      },
      generatedAt: Date.now(),
    };
  }

  // Real-time Analysis Methods

  private async performRealTimeAnalysis(): Promise<void> {
    try {
      await this.updateRealTimeMetrics();
      await this.updatePatterns();
      await this.checkForAnomalies();
      await this.updatePredictions();
    } catch (error) {
      logger.error('Real-time analysis failed', error);
    }
  }

  private async updateRealTimeMetrics(): Promise<void> {
    const recentEvents = await this.getRecentEvents();
    if (recentEvents.length > 0) {
      this.realTimeMetrics = this.metricsCalculator.calculateRealTimeMetrics(recentEvents);

      // Store for historical comparison
      await this.storage.saveRealtimeMetrics(`snapshot_${Date.now()}`, this.realTimeMetrics);

      // Emit metrics update event
      this.emitMetricsUpdate(this.realTimeMetrics);
    }
  }

  private async updatePatterns(): Promise<void> {
    const recentEvents = await this.getRecentEvents(24 * 60 * 60 * 1000); // Last 24 hours
    this.currentPatterns = await this.patternRecognizer.analyzePatterns(recentEvents);

    // Update pattern models with new data
    await this.patternRecognizer.updatePatternModels(recentEvents);
  }

  private async checkForAnomalies(): Promise<void> {
    if (!this.realTimeMetrics) return;

    const anomalies = await this.patternRecognizer.detectAnomalies(this.realTimeMetrics);

    if (anomalies.length > 0) {
      // Log anomalies
      logger.warn('Learning anomalies detected', { count: anomalies.length });

      // Store anomalies for review
      await this.storage.saveAnalyticsEvents(
        anomalies.map(a => ({
          type: 'anomaly_detected' as any,
          sessionId: this.getCurrentSessionId(),
          data: a,
          timestamp: Date.now(),
        }))
      );

      // Emit anomaly alert
      this.emitAnomalyAlert(anomalies);
    }
  }

  private async updatePredictions(): Promise<void> {
    // Update prediction models with latest data
    const recentEvents = await this.getRecentEvents();

    if (recentEvents.length >= 10) {
      // Train models with sufficient data
      await this.predictiveAnalytics.trainModel(PredictionType.SESSION_SUCCESS_RATE, recentEvents);
    }
  }

  // Session Analysis

  private async generateSessionSummary(userId?: string): Promise<void> {
    const sessionEvents = await this.getCurrentSessionEvents();
    const sessionMetrics = this.metricsCalculator.calculateRealTimeMetrics(sessionEvents);

    const summary = {
      sessionId: sessionEvents[0]?.sessionId,
      userId,
      duration: sessionMetrics.sessionMetrics.duration,
      wordsStudied: sessionMetrics.sessionMetrics.wordsAttempted,
      accuracy: sessionMetrics.sessionMetrics.accuracy,
      patterns: await this.patternRecognizer.analyzePatterns(sessionEvents),
      improvements: this.calculateSessionImprovements(sessionMetrics),
      nextSessionRecommendations: await this.generateNextSessionRecommendations(sessionMetrics),
    };

    await this.storage.saveAnalyticsEvents([
      {
        type: 'session_summary' as any,
        sessionId: summary.sessionId,
        data: summary,
        timestamp: Date.now(),
      },
    ]);

    // Emit session completed event
    this.emitSessionCompleted(summary);
  }

  private calculateSessionImprovements(metrics: RealTimeMetrics): any {
    // Compare with previous sessions
    return {
      accuracyImprovement: 0, // Would calculate from historical data
      speedImprovement: 0,
      consistencyImprovement: 0,
      difficultyProgression: metrics.learningMetrics.difficultyProgression,
    };
  }

  private async generateNextSessionRecommendations(
    metrics: RealTimeMetrics
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];

    // Based on current performance
    if (metrics.sessionMetrics.accuracy > 0.8) {
      recommendations.push({
        type: 'difficulty_increase',
        priority: 'high',
        action: 'increase_difficulty',
        value: 1,
        reasoning: ['Excellent accuracy! Consider increasing difficulty level'],
        confidence: 0.85,
        expectedImprovement: 0.15,
      });
    } else if (metrics.sessionMetrics.accuracy < 0.6) {
      recommendations.push({
        type: 'difficulty_decrease',
        priority: 'high',
        action: 'decrease_difficulty',
        value: -1,
        reasoning: ['Low accuracy detected', 'Consider reviewing easier content'],
        confidence: 0.8,
        expectedImprovement: 0.2,
      });
    }

    // Based on engagement
    if (metrics.behavioralMetrics.engagementScore < 0.6) {
      recommendations.push({
        type: 'break_suggestion',
        priority: 'medium',
        action: 'suggest_break',
        value: 300000, // 5 minutes
        reasoning: ['Low engagement detected', 'Break recommended for optimal learning'],
        confidence: 0.7,
        expectedImprovement: 0.1,
      });
    }

    return recommendations;
  }

  // Data Retrieval Methods

  private async getRecentEvents(timeframe = 30 * 60 * 1000): Promise<AnalyticsEvent[]> {
    const cutoff = Date.now() - timeframe;
    // In a real implementation, this would query the storage system
    // For now, we'll use a simplified approach
    const allEvents =
      (await this.storage.loadAnalyticsEvents({
        timeRange: { start: Date.now() - 86400000, end: Date.now() },
      })) || [];
    return allEvents.filter((event: AnalyticsEvent) => event.timestamp >= cutoff);
  }

  private async getCurrentSessionEvents(): Promise<AnalyticsEvent[]> {
    const allEvents = await this.getRecentEvents(24 * 60 * 60 * 1000); // Last 24 hours

    // Find the most recent session start
    const sessionStarts = allEvents.filter(e => e.type === AnalyticsEventType.SESSION_START);
    if (sessionStarts.length === 0) return [];

    const latestSessionStart = sessionStarts[sessionStarts.length - 1];
    return allEvents.filter(e => e.sessionId === latestSessionStart.sessionId);
  }

  private async getEventsForPeriod(period: {
    start: number;
    end: number;
  }): Promise<AnalyticsEvent[]> {
    // This would typically query a database with proper indexing
    const allEvents = (await this.storage.loadAnalyticsEvents()) || [];
    return allEvents.filter(
      (event: AnalyticsEvent) => event.timestamp >= period.start && event.timestamp <= period.end
    );
  }

  // Report Generation

  private async generateAnalyticsSummary(events: AnalyticsEvent[]): Promise<any> {
    const sessions = new Set(events.map(e => e.sessionId)).size;
    const words = new Set(events.filter(e => e.data.word).map(e => e.data.word)).size;
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const successes = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length;
    const achievements = events.filter(
      e => e.type === AnalyticsEventType.ACHIEVEMENT_UNLOCKED
    ).length;

    const totalTime =
      events.length > 0 ? events[events.length - 1].timestamp - events[0].timestamp : 0;

    return {
      totalSessions: sessions,
      totalWords: words,
      averageAccuracy: attempts > 0 ? successes / attempts : 0,
      totalStudyTime: totalTime,
      improvementRate: 0, // Would calculate from historical comparison
      achievementsUnlocked: achievements,
    };
  }

  private async analyzeTrends(_events: AnalyticsEvent[]): Promise<any[]> {
    // Simplified trend analysis
    return [
      {
        metric: 'accuracy',
        direction: 'increasing',
        magnitude: 0.05,
        significance: 0.8,
        timeframe: 7 * 24 * 60 * 60 * 1000,
      },
    ];
  }

  private async generateInsights(events: AnalyticsEvent[]): Promise<any[]> {
    const insights = [];

    // Performance insights
    const accuracy = this.calculateAccuracy(events);
    if (accuracy > 0.8) {
      insights.push({
        type: 'performance_improvement',
        title: 'Excellent Progress',
        description: `Your accuracy of ${(accuracy * 100).toFixed(1)}% shows strong learning progress`,
        confidence: 0.9,
        actionable: true,
        relatedMetrics: ['accuracy', 'consistency'],
      });
    }

    return insights;
  }

  private async generateRecommendations(
    _events: AnalyticsEvent[]
  ): Promise<LearningRecommendation[]> {
    // Generate recommendations based on analysis
    return await this.getLearningRecommendations('current_user');
  }

  // Utility Methods

  private isCriticalEvent(type: AnalyticsEventType): boolean {
    return [
      AnalyticsEventType.LEVEL_UP,
      AnalyticsEventType.ACHIEVEMENT_UNLOCKED,
      AnalyticsEventType.SESSION_END,
    ].includes(type);
  }

  private calculateAccuracy(events: AnalyticsEvent[]): number {
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const successes = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length;
    return attempts > 0 ? successes / attempts : 0;
  }

  private getDefaultPeriod(type: ReportType): { start: number; end: number } {
    const now = Date.now();
    const periods = {
      [ReportType.DAILY]: 24 * 60 * 60 * 1000,
      [ReportType.WEEKLY]: 7 * 24 * 60 * 60 * 1000,
      [ReportType.MONTHLY]: 30 * 24 * 60 * 60 * 1000,
      [ReportType.CUSTOM]: 24 * 60 * 60 * 1000,
      [ReportType.REAL_TIME]: 60 * 60 * 1000,
    };

    return {
      start: now - periods[type],
      end: now,
    };
  }

  private async buildPredictionContext(
    userId: string,
    partial?: Partial<PredictionContext>
  ): Promise<PredictionContext> {
    const currentMetrics = await this.getCurrentMetrics();
    const now = new Date();

    return {
      userId,
      sessionId: partial?.sessionId || this.currentSessionId,
      currentLevel: partial?.currentLevel || 1,
      sessionTime: partial?.sessionTime || Date.now(),
      recentPerformance: partial?.recentPerformance || currentMetrics?.performanceMetrics,
      currentSession: currentMetrics?.sessionMetrics || {
        duration: 0,
        wordsAttempted: 0,
        wordsCompleted: 0,
        accuracy: 0,
        streakCount: 0,
        pauseCount: 0,
        hintsUsed: 0,
      },
      learningHistory: currentMetrics?.learningMetrics || {
        averageResponseTime: 0,
        difficultyProgression: 0,
        retentionRate: 0,
        masteryLevel: 0,
        weakAreas: [],
        strongAreas: [],
      },
      timeOfDay: partial?.timeOfDay || now.getHours(),
      dayOfWeek: partial?.dayOfWeek || now.getDay(),
    };
  }

  // Event Emission

  private emitMetricsUpdate(metrics: RealTimeMetrics): void {
    const event = new CustomEvent('analytics:metricsUpdate', {
      detail: { metrics },
    });
    window.dispatchEvent(event);
  }

  private emitAnomalyAlert(anomalies: LearningPattern[]): void {
    const event = new CustomEvent('analytics:anomalyDetected', {
      detail: { anomalies },
    });
    window.dispatchEvent(event);
  }

  private emitSessionCompleted(summary: any): void {
    const event = new CustomEvent('analytics:sessionCompleted', {
      detail: { summary },
    });
    window.dispatchEvent(event);
  }

  // Lifecycle Management

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.performRealTimeAnalysis();
    }, this.config.flushInterval);
  }

  async flush(): Promise<void> {
    await this.collector.flush();
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.flush();
  }
}
