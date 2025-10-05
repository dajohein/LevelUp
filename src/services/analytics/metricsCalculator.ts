/**
 * Real-time Metrics Calculator
 * Advanced metrics calculation with incremental updates and caching
 */

import {
  IMetricsCalculator,
  AnalyticsEvent,
  AnalyticsEventType,
  RealTimeMetrics,
  SessionMetrics,
  LearningMetrics,
  PerformanceMetrics,
  BehavioralMetrics,
  LearningStyle,
  SessionPattern
} from './interfaces';
import { EnhancedStorageService } from '../storage/enhancedStorage';
import { logger } from '../logger';

export class MetricsCalculator implements IMetricsCalculator {
  private metricsCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache for real-time metrics

  constructor(private storage: EnhancedStorageService) {}

  calculateRealTimeMetrics(events: AnalyticsEvent[]): RealTimeMetrics {
    const cacheKey = `realtime_${events.length}_${events[events.length - 1]?.timestamp}`;
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const metrics: RealTimeMetrics = {
      sessionMetrics: this.calculateSessionMetrics(events),
      learningMetrics: this.calculateLearningMetrics(events),
      performanceMetrics: this.calculatePerformanceMetrics(events),
      behavioralMetrics: this.calculateBehavioralMetrics(events)
    };

    this.metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });
    return metrics;
  }

  updateSessionMetrics(event: AnalyticsEvent): SessionMetrics {
    // For incremental updates, we maintain running totals
    const sessionKey = `session_${event.sessionId}`;
    const existing = this.metricsCache.get(sessionKey)?.data || {
      duration: 0,
      wordsAttempted: 0,
      wordsCompleted: 0,
      accuracy: 0,
      streakCount: 0,
      pauseCount: 0,
      hintsUsed: 0
    };

    const updated = { ...existing };

    switch (event.type) {
      case AnalyticsEventType.WORD_ATTEMPT:
        updated.wordsAttempted++;
        break;
      case AnalyticsEventType.WORD_SUCCESS:
        updated.wordsCompleted++;
        updated.streakCount++;
        break;
      case AnalyticsEventType.WORD_FAILURE:
        updated.streakCount = 0;
        break;
      case AnalyticsEventType.HINT_USED:
        updated.hintsUsed++;
        break;
      case AnalyticsEventType.PAUSE_SESSION:
        updated.pauseCount++;
        break;
    }

    // Recalculate derived metrics
    updated.accuracy = updated.wordsAttempted > 0 ? 
      updated.wordsCompleted / updated.wordsAttempted : 0;

    this.metricsCache.set(sessionKey, { data: updated, timestamp: Date.now() });
    return updated;
  }

  async calculateLearningProgress(userId: string, timeframe = 7 * 24 * 60 * 60 * 1000): Promise<LearningMetrics> {
    try {
      const cutoff = Date.now() - timeframe;
      const events = await this.getEventsForUser(userId, cutoff);
      
      return this.calculateLearningMetrics(events);
    } catch (error) {
      logger.error('Failed to calculate learning progress', error);
      return this.getDefaultLearningMetrics();
    }
  }

  // Session Metrics Calculation
  private calculateSessionMetrics(events: AnalyticsEvent[]): SessionMetrics {
    const sessionStart = events.find(e => e.type === AnalyticsEventType.SESSION_START);
    const sessionEnd = events.find(e => e.type === AnalyticsEventType.SESSION_END);
    
    const wordAttempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT);
    const wordSuccesses = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS);
    const hints = events.filter(e => e.type === AnalyticsEventType.HINT_USED);
    const pauses = events.filter(e => e.type === AnalyticsEventType.PAUSE_SESSION);
    
    const duration = this.calculateSessionDuration(events, sessionStart, sessionEnd);
    const accuracy = wordAttempts.length > 0 ? wordSuccesses.length / wordAttempts.length : 0;
    const streakCount = this.calculateMaxStreak(events);

    return {
      duration,
      wordsAttempted: wordAttempts.length,
      wordsCompleted: wordSuccesses.length,
      accuracy,
      streakCount,
      pauseCount: pauses.length,
      hintsUsed: hints.length
    };
  }

  // Learning Metrics Calculation
  private calculateLearningMetrics(events: AnalyticsEvent[]): LearningMetrics {
    const responseTimeEvents = events.filter(e => e.data.responseTime);
    const averageResponseTime = responseTimeEvents.length > 0 ?
      responseTimeEvents.reduce((sum, e) => sum + e.data.responseTime, 0) / responseTimeEvents.length : 0;

    const difficultyProgression = this.calculateDifficultyProgression(events);
    const retentionRate = this.calculateRetentionRate(events);
    const masteryLevel = this.calculateMasteryLevel(events);
    const { weakAreas, strongAreas } = this.analyzeTopicStrengths(events);

    return {
      averageResponseTime,
      difficultyProgression,
      retentionRate,
      masteryLevel,
      weakAreas,
      strongAreas
    };
  }

  // Performance Metrics Calculation
  private calculatePerformanceMetrics(events: AnalyticsEvent[]): PerformanceMetrics {
    const wordEvents = events.filter(e => 
      [AnalyticsEventType.WORD_SUCCESS, AnalyticsEventType.WORD_FAILURE].includes(e.type)
    );

    const totalTime = this.calculateTotalActiveTime(events);
    const wordsPerMinute = totalTime > 0 ? (wordEvents.length / totalTime) * 60000 : 0;
    
    const errorRate = this.calculateErrorRate(events);
    const improvementRate = this.calculateImprovementRate(events);
    const consistencyScore = this.calculateConsistencyScore(events);
    const peakPerformanceTime = this.findPeakPerformanceTime(events);

    return {
      wordsPerMinute,
      errorRate,
      improvementRate,
      consistencyScore,
      peakPerformanceTime
    };
  }

  // Behavioral Metrics Calculation
  private calculateBehavioralMetrics(events: AnalyticsEvent[]): BehavioralMetrics {
    const engagementScore = this.calculateEngagementScore(events);
    const persistenceLevel = this.calculatePersistenceLevel(events);
    const learningStyle = this.detectLearningStyle(events);
    const preferredDifficulty = this.calculatePreferredDifficulty(events);
    const sessionPattern = this.detectSessionPattern(events);

    return {
      engagementScore,
      persistenceLevel,
      learningStyle,
      preferredDifficulty,
      sessionPattern
    };
  }

  // Helper Methods

  private calculateSessionDuration(
    events: AnalyticsEvent[], 
    sessionStart?: AnalyticsEvent, 
    sessionEnd?: AnalyticsEvent
  ): number {
    if (sessionStart && sessionEnd) {
      return sessionEnd.timestamp - sessionStart.timestamp;
    }
    
    if (events.length === 0) return 0;
    
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    return lastEvent.timestamp - firstEvent.timestamp;
  }

  private calculateMaxStreak(events: AnalyticsEvent[]): number {
    const wordEvents = events
      .filter(e => [AnalyticsEventType.WORD_SUCCESS, AnalyticsEventType.WORD_FAILURE].includes(e.type))
      .sort((a, b) => a.timestamp - b.timestamp);

    let maxStreak = 0;
    let currentStreak = 0;

    for (const event of wordEvents) {
      if (event.type === AnalyticsEventType.WORD_SUCCESS) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }

  private calculateDifficultyProgression(events: AnalyticsEvent[]): number {
    const difficultyEvents = events.filter(e => e.data.difficulty !== undefined);
    if (difficultyEvents.length < 2) return 0;

    const firstDifficulty = difficultyEvents[0].data.difficulty;
    const lastDifficulty = difficultyEvents[difficultyEvents.length - 1].data.difficulty;
    
    return lastDifficulty - firstDifficulty;
  }

  private calculateRetentionRate(events: AnalyticsEvent[]): number {
    // Simple retention calculation based on repeated correct answers
    const wordSuccesses = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS);
    const uniqueWords = new Set(wordSuccesses.map(e => e.data.word));
    const repeatedCorrectAnswers = wordSuccesses.length - uniqueWords.size;
    
    return uniqueWords.size > 0 ? repeatedCorrectAnswers / uniqueWords.size : 0;
  }

  private calculateMasteryLevel(events: AnalyticsEvent[]): number {
    const wordAttempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT);
    const wordSuccesses = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS);
    
    if (wordAttempts.length === 0) return 0;
    
    const accuracy = wordSuccesses.length / wordAttempts.length;
    const consistency = this.calculateConsistencyScore(events);
    const progression = Math.min(this.calculateDifficultyProgression(events) / 5, 1); // Normalize to 0-1
    
    return (accuracy * 0.5 + consistency * 0.3 + progression * 0.2);
  }

  private analyzeTopicStrengths(events: AnalyticsEvent[]): { weakAreas: string[]; strongAreas: string[] } {
    const topicPerformance = new Map<string, { correct: number; total: number }>();
    
    events.forEach(event => {
      const topic = event.data.topic || event.data.category;
      if (!topic) return;
      
      if (!topicPerformance.has(topic)) {
        topicPerformance.set(topic, { correct: 0, total: 0 });
      }
      
      const performance = topicPerformance.get(topic)!;
      
      if (event.type === AnalyticsEventType.WORD_ATTEMPT) {
        performance.total++;
      }
      if (event.type === AnalyticsEventType.WORD_SUCCESS) {
        performance.correct++;
      }
    });
    
    const weakAreas: string[] = [];
    const strongAreas: string[] = [];
    
    topicPerformance.forEach((performance, topic) => {
      if (performance.total >= 3) { // Only consider topics with sufficient data
        const accuracy = performance.correct / performance.total;
        if (accuracy < 0.6) {
          weakAreas.push(topic);
        } else if (accuracy > 0.8) {
          strongAreas.push(topic);
        }
      }
    });
    
    return { weakAreas, strongAreas };
  }

  private calculateTotalActiveTime(events: AnalyticsEvent[]): number {
    const pauseEvents = events.filter(e => e.type === AnalyticsEventType.PAUSE_SESSION);
    const resumeEvents = events.filter(e => e.type === AnalyticsEventType.RESUME_SESSION);
    
    if (pauseEvents.length === 0) {
      return this.calculateSessionDuration(events);
    }
    
    // Calculate time excluding pauses
    let totalActiveTime = 0;
    let lastResumeTime = events[0]?.timestamp || 0;
    
    for (const pauseEvent of pauseEvents) {
      totalActiveTime += pauseEvent.timestamp - lastResumeTime;
      
      const correspondingResume = resumeEvents.find(r => r.timestamp > pauseEvent.timestamp);
      lastResumeTime = correspondingResume?.timestamp || pauseEvent.timestamp;
    }
    
    // Add time from last resume to end
    const lastEvent = events[events.length - 1];
    if (lastEvent && lastResumeTime < lastEvent.timestamp) {
      totalActiveTime += lastEvent.timestamp - lastResumeTime;
    }
    
    return totalActiveTime;
  }

  private calculateErrorRate(events: AnalyticsEvent[]): number {
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const failures = events.filter(e => e.type === AnalyticsEventType.WORD_FAILURE).length;
    
    return attempts > 0 ? failures / attempts : 0;
  }

  private calculateImprovementRate(events: AnalyticsEvent[]): number {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const recentEvents = events.filter(e => now - e.timestamp < timeWindow);
    const earlierEvents = events.filter(e => now - e.timestamp >= timeWindow && now - e.timestamp < timeWindow * 2);
    
    const recentAccuracy = this.calculateAccuracy(recentEvents);
    const earlierAccuracy = this.calculateAccuracy(earlierEvents);
    
    return recentAccuracy - earlierAccuracy;
  }

  private calculateAccuracy(events: AnalyticsEvent[]): number {
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const successes = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length;
    
    return attempts > 0 ? successes / attempts : 0;
  }

  private calculateConsistencyScore(events: AnalyticsEvent[]): number {
    const responseTimeEvents = events.filter(e => e.data.responseTime);
    if (responseTimeEvents.length < 3) return 0;
    
    const responseTimes = responseTimeEvents.map(e => e.data.responseTime);
    const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to consistency score (lower deviation = higher consistency)
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private findPeakPerformanceTime(events: AnalyticsEvent[]): number {
    // Group events by hour of day and find best performing hour
    const hourlyPerformance = new Map<number, { correct: number; total: number }>();
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!hourlyPerformance.has(hour)) {
        hourlyPerformance.set(hour, { correct: 0, total: 0 });
      }
      
      const performance = hourlyPerformance.get(hour)!;
      
      if (event.type === AnalyticsEventType.WORD_ATTEMPT) {
        performance.total++;
      }
      if (event.type === AnalyticsEventType.WORD_SUCCESS) {
        performance.correct++;
      }
    });
    
    let bestHour = 0;
    let bestAccuracy = 0;
    
    hourlyPerformance.forEach((performance, hour) => {
      if (performance.total >= 3) { // Minimum attempts for statistical significance
        const accuracy = performance.correct / performance.total;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestHour = hour;
        }
      }
    });
    
    return bestHour;
  }

  private calculateEngagementScore(events: AnalyticsEvent[]): number {
    const sessionDuration = this.calculateSessionDuration(events);
    const activeTime = this.calculateTotalActiveTime(events);
    const wordEvents = events.filter(e => 
      [AnalyticsEventType.WORD_ATTEMPT, AnalyticsEventType.WORD_SUCCESS].includes(e.type)
    );
    
    // Engagement based on active time ratio and activity level
    const activeRatio = sessionDuration > 0 ? activeTime / sessionDuration : 0;
    const activityLevel = activeTime > 0 ? wordEvents.length / (activeTime / 60000) : 0; // words per minute
    
    return Math.min(1, (activeRatio * 0.6 + Math.min(activityLevel / 10, 1) * 0.4));
  }

  private calculatePersistenceLevel(events: AnalyticsEvent[]): number {
    const failures = events.filter(e => e.type === AnalyticsEventType.WORD_FAILURE);
    const retries = events.filter(e => e.type === AnalyticsEventType.RETRY_WORD);
    const quits = events.filter(e => e.type === AnalyticsEventType.SESSION_END);
    
    // Persistence = tendency to retry after failure and continue sessions
    const retryRate = failures.length > 0 ? retries.length / failures.length : 1;
    const sessionCompletion = quits.length > 0 ? 1 : 0.5; // Bonus for completing sessions
    
    return Math.min(1, retryRate * 0.7 + sessionCompletion * 0.3);
  }

  private detectLearningStyle(events: AnalyticsEvent[]): LearningStyle {
    const hintUsage = events.filter(e => e.type === AnalyticsEventType.HINT_USED).length;
    const audioEvents = events.filter(e => e.data.audioUsed).length;
    const visualEvents = events.filter(e => e.data.visualAid).length;
    
    const totalEvents = events.length;
    
    if (totalEvents === 0) return LearningStyle.MIXED;
    
    const hintRatio = hintUsage / totalEvents;
    const audioRatio = audioEvents / totalEvents;
    const visualRatio = visualEvents / totalEvents;
    
    if (audioRatio > 0.3) return LearningStyle.AUDITORY;
    if (visualRatio > 0.3) return LearningStyle.VISUAL;
    if (hintRatio > 0.2) return LearningStyle.READING_WRITING;
    
    return LearningStyle.MIXED;
  }

  private calculatePreferredDifficulty(events: AnalyticsEvent[]): number {
    // const difficultyEvents = events.filter(e => e.data.difficulty !== undefined);
    const successfulDifficulties = events
      .filter(e => e.type === AnalyticsEventType.WORD_SUCCESS && e.data.difficulty !== undefined)
      .map(e => e.data.difficulty);
    
    if (successfulDifficulties.length === 0) return 1;
    
    return successfulDifficulties.reduce((sum, diff) => sum + diff, 0) / successfulDifficulties.length;
  }

  private detectSessionPattern(events: AnalyticsEvent[]): SessionPattern {
    // Analyze session lengths and frequency patterns
    const sessionStarts = events.filter(e => e.type === AnalyticsEventType.SESSION_START);
    const sessionEnds = events.filter(e => e.type === AnalyticsEventType.SESSION_END);
    
    if (sessionStarts.length < 2) return SessionPattern.IRREGULAR;
    
    const sessionDurations = sessionEnds.map((end, index) => {
      const start = sessionStarts[index];
      return start ? end.timestamp - start.timestamp : 0;
    }).filter(duration => duration > 0);
    
    // const averageDuration = sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length;
    const shortSessions = sessionDurations.filter(d => d < 10 * 60 * 1000).length; // Less than 10 minutes
    const longSessions = sessionDurations.filter(d => d > 30 * 60 * 1000).length; // More than 30 minutes
    
    const shortRatio = shortSessions / sessionDurations.length;
    const longRatio = longSessions / sessionDurations.length;
    
    if (shortRatio > 0.7) return SessionPattern.SHORT_FREQUENT;
    if (longRatio > 0.5) return SessionPattern.LONG_INTENSIVE;
    
    return SessionPattern.MIXED;
  }

  private async getEventsForUser(userId: string, cutoff: number): Promise<AnalyticsEvent[]> {
    // This would typically query a database or storage system
    // For now, we'll use the enhanced storage service
    const allEvents = await this.storage.loadAnalyticsEvents({ userId }) || [];
    return allEvents.filter((event: AnalyticsEvent) => event.timestamp >= cutoff);
  }

  private getDefaultLearningMetrics(): LearningMetrics {
    return {
      averageResponseTime: 0,
      difficultyProgression: 0,
      retentionRate: 0,
      masteryLevel: 0,
      weakAreas: [],
      strongAreas: []
    };
  }
}