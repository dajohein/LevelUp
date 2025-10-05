/**
 * Pattern Recognition Engine
 * Advanced behavioral pattern detection and learning analytics
 */

import {
  IPatternRecognizer,
  AnalyticsEvent,
  AnalyticsEventType,
  LearningPattern,
  PatternType,
  RealTimeMetrics
} from './interfaces';
import { EnhancedStorageService } from '../storage/enhancedStorage';
import { logger } from '../logger';

interface PatternDetector {
  type: PatternType;
  detect(events: AnalyticsEvent[], context?: any): LearningPattern | null;
  confidence: number;
  minDataPoints: number;
}

export class PatternRecognizer implements IPatternRecognizer {
  private detectors: PatternDetector[] = [];
  private patternHistory = new Map<string, LearningPattern[]>();
  private modelWeights = new Map<PatternType, number>();

  constructor(private storage: EnhancedStorageService) {
    this.initializeDetectors();
    this.loadPatternHistory();
  }

  async analyzePatterns(events: AnalyticsEvent[], timeframe = 24 * 60 * 60 * 1000): Promise<LearningPattern[]> {
    try {
      const recentEvents = events.filter(e => Date.now() - e.timestamp <= timeframe);
      const patterns: LearningPattern[] = [];

      // Run all pattern detectors
      for (const detector of this.detectors) {
        if (recentEvents.length >= detector.minDataPoints) {
          const pattern = detector.detect(recentEvents);
          if (pattern) {
            patterns.push(pattern);
          }
        }
      }

      // Filter and rank patterns by confidence
      const validPatterns = patterns
        .filter(p => p.confidence >= 0.6) // Minimum confidence threshold
        .sort((a, b) => b.confidence - a.confidence);

      // Update pattern history
      await this.updatePatternHistory(validPatterns);

      return validPatterns;
    } catch (error) {
      logger.error('Pattern analysis failed', error);
      return [];
    }
  }

  async detectAnomalies(metrics: RealTimeMetrics): Promise<LearningPattern[]> {
    const anomalies: LearningPattern[] = [];

    try {
      // Load historical metrics for comparison
      const historicalMetrics = await this.getHistoricalMetrics();
      
      // Detect performance anomalies
      const performanceAnomaly = this.detectPerformanceAnomaly(metrics, historicalMetrics);
      if (performanceAnomaly) anomalies.push(performanceAnomaly);

      // Detect engagement anomalies
      const engagementAnomaly = this.detectEngagementAnomaly(metrics, historicalMetrics);
      if (engagementAnomaly) anomalies.push(engagementAnomaly);

      // Detect learning rate anomalies
      const learningAnomaly = this.detectLearningRateAnomaly(metrics, historicalMetrics);
      if (learningAnomaly) anomalies.push(learningAnomaly);

      return anomalies;
    } catch (error) {
      logger.error('Anomaly detection failed', error);
      return [];
    }
  }

  async updatePatternModels(newData: AnalyticsEvent[]): Promise<void> {
    try {
      // Update pattern detector weights based on recent accuracy
      await this.adjustDetectorWeights(newData);
      
      // Train adaptive patterns based on user behavior
      await this.trainAdaptivePatterns(newData);
      
      // Clean up old pattern data
      await this.cleanupOldPatterns();

      logger.info('Pattern models updated', { dataPoints: newData.length });
    } catch (error) {
      logger.error('Failed to update pattern models', error);
    }
  }

  // Initialize Pattern Detectors
  private initializeDetectors(): void {
    this.detectors = [
      {
        type: PatternType.DIFFICULTY_SPIKE,
        detect: this.detectDifficultySpike.bind(this),
        confidence: 0.8,
        minDataPoints: 10
      },
      {
        type: PatternType.LEARNING_PLATEAU,
        detect: this.detectLearningPlateau.bind(this),
        confidence: 0.7,
        minDataPoints: 15
      },
      {
        type: PatternType.RAPID_IMPROVEMENT,
        detect: this.detectRapidImprovement.bind(this),
        confidence: 0.75,
        minDataPoints: 8
      },
      {
        type: PatternType.CONSISTENCY_DROP,
        detect: this.detectConsistencyDrop.bind(this),
        confidence: 0.8,
        minDataPoints: 12
      },
      {
        type: PatternType.TIME_PREFERENCE,
        detect: this.detectTimePreference.bind(this),
        confidence: 0.6,
        minDataPoints: 20
      },
      {
        type: PatternType.TOPIC_AFFINITY,
        detect: this.detectTopicAffinity.bind(this),
        confidence: 0.7,
        minDataPoints: 15
      },
      {
        type: PatternType.FORGETTING_CURVE,
        detect: this.detectForgettingCurve.bind(this),
        confidence: 0.8,
        minDataPoints: 10
      }
    ];
  }

  // Pattern Detection Methods

  private detectDifficultySpike(events: AnalyticsEvent[]): LearningPattern | null {
    const difficultyEvents = events.filter(e => e.data.difficulty !== undefined);
    if (difficultyEvents.length < 5) return null;

    // Calculate difficulty progression
    const difficulties = difficultyEvents.map(e => e.data.difficulty);
    const recentDifficulties = difficulties.slice(-5);
    const earlierDifficulties = difficulties.slice(0, -5);

    const recentAvg = recentDifficulties.reduce((a, b) => a + b, 0) / recentDifficulties.length;
    const earlierAvg = earlierDifficulties.reduce((a, b) => a + b, 0) / earlierDifficulties.length;

    const difficultyIncrease = recentAvg - earlierAvg;

    if (difficultyIncrease > 1.5) { // Significant difficulty spike
      const failures = events.filter(e => 
        e.type === AnalyticsEventType.WORD_FAILURE && 
        e.timestamp >= difficultyEvents[difficultyEvents.length - 5].timestamp
      );

      const confidence = Math.min(0.9, 0.6 + (difficultyIncrease / 3) + (failures.length / 10));

      return {
        id: `difficulty_spike_${Date.now()}`,
        type: PatternType.DIFFICULTY_SPIKE,
        confidence,
        description: `Difficulty increased by ${difficultyIncrease.toFixed(1)} levels with ${failures.length} recent failures`,
        recommendations: [
          'Consider reducing difficulty temporarily',
          'Review fundamental concepts',
          'Increase practice frequency for challenging words'
        ],
        timeframe: {
          start: difficultyEvents[difficultyEvents.length - 5].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectLearningPlateau(events: AnalyticsEvent[]): LearningPattern | null {
    const wordEvents = events.filter(e => 
      [AnalyticsEventType.WORD_SUCCESS, AnalyticsEventType.WORD_FAILURE].includes(e.type)
    );

    if (wordEvents.length < 15) return null;

    // Check for consistent accuracy without improvement
    const recentEvents = wordEvents.slice(-15);
    const accuracyPoints = [];

    // Calculate accuracy in sliding windows of 5 events
    for (let i = 0; i <= recentEvents.length - 5; i++) {
      const window = recentEvents.slice(i, i + 5);
      const successes = window.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length;
      accuracyPoints.push(successes / 5);
    }

    // Check if accuracy is flat (standard deviation < 0.1)
    const mean = accuracyPoints.reduce((a, b) => a + b, 0) / accuracyPoints.length;
    const variance = accuracyPoints.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracyPoints.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.1 && mean > 0.4 && mean < 0.8) { // Plateau detected
      return {
        id: `learning_plateau_${Date.now()}`,
        type: PatternType.LEARNING_PLATEAU,
        confidence: 0.7 + (0.2 * (1 - stdDev * 10)), // Higher confidence for flatter plateau
        description: `Learning plateau detected with ${(mean * 100).toFixed(1)}% accuracy over ${accuracyPoints.length} windows`,
        recommendations: [
          'Introduce new challenge types',
          'Mix in easier content to build confidence',
          'Try different learning approaches',
          'Take a short break and return refreshed'
        ],
        timeframe: {
          start: recentEvents[0].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectRapidImprovement(events: AnalyticsEvent[]): LearningPattern | null {
    const wordEvents = events.filter(e => 
      [AnalyticsEventType.WORD_SUCCESS, AnalyticsEventType.WORD_FAILURE].includes(e.type)
    );

    if (wordEvents.length < 8) return null;

    // Compare recent performance to earlier performance
    const recentEvents = wordEvents.slice(-4);
    const earlierEvents = wordEvents.slice(-8, -4);

    const recentAccuracy = recentEvents.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length / recentEvents.length;
    const earlierAccuracy = earlierEvents.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length / earlierEvents.length;

    const improvement = recentAccuracy - earlierAccuracy;

    if (improvement > 0.3) { // Significant improvement
      return {
        id: `rapid_improvement_${Date.now()}`,
        type: PatternType.RAPID_IMPROVEMENT,
        confidence: 0.75 + Math.min(0.2, improvement),
        description: `Rapid improvement detected: accuracy increased by ${(improvement * 100).toFixed(1)}%`,
        recommendations: [
          'Excellent progress! Consider increasing difficulty',
          'Maintain current learning approach',
          'Introduce new challenging topics',
          'Set higher learning goals'
        ],
        timeframe: {
          start: earlierEvents[0].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectConsistencyDrop(events: AnalyticsEvent[]): LearningPattern | null {
    const responseTimeEvents = events.filter(e => e.data.responseTime);
    if (responseTimeEvents.length < 12) return null;

    // Calculate consistency over time
    const recentTimes = responseTimeEvents.slice(-6).map(e => e.data.responseTime);
    const earlierTimes = responseTimeEvents.slice(-12, -6).map(e => e.data.responseTime);

    const recentVariance = this.calculateVariance(recentTimes);
    const earlierVariance = this.calculateVariance(earlierTimes);

    const consistencyDrop = recentVariance / earlierVariance;

    if (consistencyDrop > 2.0) { // Significant consistency drop
      return {
        id: `consistency_drop_${Date.now()}`,
        type: PatternType.CONSISTENCY_DROP,
        confidence: 0.8,
        description: `Response time consistency decreased by ${((consistencyDrop - 1) * 100).toFixed(1)}%`,
        recommendations: [
          'Take a break to refocus',
          'Review study environment for distractions',
          'Consider shorter study sessions',
          'Check if difficulty is appropriate'
        ],
        timeframe: {
          start: responseTimeEvents[responseTimeEvents.length - 6].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectTimePreference(events: AnalyticsEvent[]): LearningPattern | null {
    if (events.length < 20) return null;

    // Group events by hour of day
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

    // Find best performing time
    let bestHour = -1;
    let bestAccuracy = 0;
    let significantData = false;

    hourlyPerformance.forEach((performance, hour) => {
      if (performance.total >= 5) { // Sufficient data
        significantData = true;
        const accuracy = performance.correct / performance.total;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestHour = hour;
        }
      }
    });

    if (significantData && bestAccuracy > 0.7) {
      return {
        id: `time_preference_${Date.now()}`,
        type: PatternType.TIME_PREFERENCE,
        confidence: 0.6 + (bestAccuracy - 0.7) / 0.3 * 0.3,
        description: `Peak performance at ${bestHour}:00 with ${(bestAccuracy * 100).toFixed(1)}% accuracy`,
        recommendations: [
          `Schedule intensive learning sessions around ${bestHour}:00`,
          'Use peak performance times for challenging content',
          'Consider lighter review during off-peak hours'
        ],
        timeframe: {
          start: events[0].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectTopicAffinity(events: AnalyticsEvent[]): LearningPattern | null {
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

    // Find strongest topic affinity
    let bestTopic = '';
    let bestAccuracy = 0;

    topicPerformance.forEach((performance, topic) => {
      if (performance.total >= 5) {
        const accuracy = performance.correct / performance.total;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestTopic = topic;
        }
      }
    });

    if (bestTopic && bestAccuracy > 0.8) {
      return {
        id: `topic_affinity_${Date.now()}`,
        type: PatternType.TOPIC_AFFINITY,
        confidence: 0.7,
        description: `Strong affinity for ${bestTopic} with ${(bestAccuracy * 100).toFixed(1)}% accuracy`,
        recommendations: [
          `Use ${bestTopic} topics to build confidence`,
          'Apply learning strategies from strong topics to weaker areas',
          'Consider advanced content in favored topics'
        ],
        timeframe: {
          start: events[0].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectForgettingCurve(events: AnalyticsEvent[]): LearningPattern | null {
    const wordSuccesses = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS);
    const wordMap = new Map<string, number[]>();

    // Group successful attempts by word
    wordSuccesses.forEach(event => {
      const word = event.data.word;
      if (!word) return;

      if (!wordMap.has(word)) {
        wordMap.set(word, []);
      }
      wordMap.get(word)!.push(event.timestamp);
    });

    // Analyze forgetting patterns
    let forgettingWords = 0;
    let totalWordsAnalyzed = 0;

    wordMap.forEach((timestamps, word) => {
      if (timestamps.length >= 2) {
        totalWordsAnalyzed++;
        const timeBetweenSuccess = timestamps[timestamps.length - 1] - timestamps[timestamps.length - 2];
        const daysBetween = timeBetweenSuccess / (24 * 60 * 60 * 1000);

        // Check if word was forgotten (failed after previous success)
        const recentFailures = events.filter(e => 
          e.type === AnalyticsEventType.WORD_FAILURE &&
          e.data.word === word &&
          e.timestamp > timestamps[timestamps.length - 1]
        );

        if (recentFailures.length > 0 && daysBetween > 1) {
          forgettingWords++;
        }
      }
    });

    const forgettingRate = totalWordsAnalyzed > 0 ? forgettingWords / totalWordsAnalyzed : 0;

    if (forgettingRate > 0.3 && totalWordsAnalyzed >= 5) {
      return {
        id: `forgetting_curve_${Date.now()}`,
        type: PatternType.FORGETTING_CURVE,
        confidence: 0.8,
        description: `Forgetting curve detected: ${(forgettingRate * 100).toFixed(1)}% of learned words need review`,
        recommendations: [
          'Implement spaced repetition for learned words',
          'Schedule regular review sessions',
          'Focus on strengthening word retention',
          'Use memory techniques for difficult words'
        ],
        affectedWords: Array.from(wordMap.keys()).slice(0, 10), // Top 10 words
        timeframe: {
          start: events[0].timestamp,
          end: Date.now()
        }
      };
    }

    return null;
  }

  // Anomaly Detection Methods

  private detectPerformanceAnomaly(current: RealTimeMetrics, historical: RealTimeMetrics[]): LearningPattern | null {
    if (historical.length < 5) return null;

    const avgAccuracy = historical.reduce((sum, m) => sum + m.sessionMetrics.accuracy, 0) / historical.length;
    const currentAccuracy = current.sessionMetrics.accuracy;

    const accuracyDrop = avgAccuracy - currentAccuracy;

    if (accuracyDrop > 0.2 && avgAccuracy > 0.5) {
      return {
        id: `performance_anomaly_${Date.now()}`,
        type: PatternType.CONSISTENCY_DROP,
        confidence: 0.85,
        description: `Performance anomaly: accuracy dropped ${(accuracyDrop * 100).toFixed(1)}% below average`,
        recommendations: [
          'Check if you need a break',
          'Review recent difficult words',
          'Consider environmental factors affecting focus'
        ],
        timeframe: {
          start: Date.now() - 60000, // Last minute
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectEngagementAnomaly(current: RealTimeMetrics, historical: RealTimeMetrics[]): LearningPattern | null {
    if (historical.length < 3) return null;

    const avgEngagement = historical.reduce((sum, m) => sum + m.behavioralMetrics.engagementScore, 0) / historical.length;
    const currentEngagement = current.behavioralMetrics.engagementScore;

    const engagementDrop = avgEngagement - currentEngagement;

    if (engagementDrop > 0.3) {
      return {
        id: `engagement_anomaly_${Date.now()}`,
        type: PatternType.CONSISTENCY_DROP,
        confidence: 0.7,
        description: `Engagement anomaly: engagement dropped ${(engagementDrop * 100).toFixed(1)}% below average`,
        recommendations: [
          'Try a different learning activity',
          'Take a short break',
          'Switch to easier content temporarily'
        ],
        timeframe: {
          start: Date.now() - 300000, // Last 5 minutes
          end: Date.now()
        }
      };
    }

    return null;
  }

  private detectLearningRateAnomaly(current: RealTimeMetrics, historical: RealTimeMetrics[]): LearningPattern | null {
    if (historical.length < 3) return null;

    const avgResponseTime = historical.reduce((sum, m) => sum + m.learningMetrics.averageResponseTime, 0) / historical.length;
    const currentResponseTime = current.learningMetrics.averageResponseTime;

    const responseTimeIncrease = currentResponseTime - avgResponseTime;

    if (responseTimeIncrease > avgResponseTime * 0.5 && avgResponseTime > 1000) {
      return {
        id: `learning_rate_anomaly_${Date.now()}`,
        type: PatternType.CONSISTENCY_DROP,
        confidence: 0.75,
        description: `Learning rate anomaly: response time increased ${(responseTimeIncrease / 1000).toFixed(1)}s above average`,
        recommendations: [
          'Content may be too difficult',
          'Take time to process information',
          'Review prerequisite concepts'
        ],
        timeframe: {
          start: Date.now() - 180000, // Last 3 minutes
          end: Date.now()
        }
      };
    }

    return null;
  }

  // Utility Methods

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private async updatePatternHistory(patterns: LearningPattern[]): Promise<void> {
    const today = new Date().toDateString();
    const existing = this.patternHistory.get(today) || [];
    
    this.patternHistory.set(today, [...existing, ...patterns]);
    
    // Save to storage
    await this.storage.saveAnalyticsEvents([{
      type: 'pattern_history_update' as any,
      sessionId: 'system',
      data: Object.fromEntries(this.patternHistory),
      timestamp: Date.now()
    }]);
  }

  private async loadPatternHistory(): Promise<void> {
    try {
      // Load pattern history data
      await this.storage.loadAnalyticsEvents({ type: 'pattern_history' });
      this.patternHistory = new Map(Object.entries(history));
    } catch (error) {
      logger.warn('Failed to load pattern history', error);
    }
  }

  private async getHistoricalMetrics(): Promise<RealTimeMetrics[]> {
    try {
      const metrics = await this.storage.loadAnalyticsEvents({ type: 'historical_metrics' }) || [];
      return Array.isArray(metrics) ? metrics : [];
    } catch (error) {
      return [];
    }
  }

  private async adjustDetectorWeights(_newData: AnalyticsEvent[]): Promise<void> {
    // Simple weight adjustment based on pattern success rate
    // In a real implementation, this would use machine learning
    for (const detector of this.detectors) {
      const currentWeight = this.modelWeights.get(detector.type) || 1.0;
      const adjustedWeight = Math.max(0.5, Math.min(1.5, currentWeight * 1.01));
      this.modelWeights.set(detector.type, adjustedWeight);
    }
  }

  private async trainAdaptivePatterns(newData: AnalyticsEvent[]): Promise<void> {
    // Placeholder for adaptive pattern training
    // Would implement reinforcement learning or similar approaches
    logger.debug('Training adaptive patterns', { dataPoints: newData.length });
  }

  private async cleanupOldPatterns(): Promise<void> {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    const cutoffDate = new Date(cutoff).toDateString();
    
    // Remove old pattern history
    for (const [date, _patterns] of this.patternHistory.entries()) {
      if (date < cutoffDate) {
        this.patternHistory.delete(date);
      }
    }
    
    await this.storage.saveAnalyticsEvents([{
      type: 'pattern_history_cleanup' as any,
      sessionId: 'system', 
      data: Object.fromEntries(this.patternHistory),
      timestamp: Date.now()
    }]);
  }
}