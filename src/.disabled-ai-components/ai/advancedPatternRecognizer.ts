/**
 * Enhanced Pattern Recognition for Advanced Learning Analytics
 * Extends the existing PatternRecognizer with sophisticated behavioral analysis
 */

import {
  AnalyticsEvent,
  AnalyticsEventType,
  LearningPattern
} from '../analytics/interfaces';
import { PatternRecognizer } from '../analytics/patternRecognizer';
import { EnhancedStorageService } from '../storage/enhancedStorage';
import { logger } from '../logger';

// New pattern types for advanced behavioral analysis
export enum AdvancedPatternType {
  LEARNING_MOMENTUM = 'learning_momentum',
  COGNITIVE_OVERLOAD = 'cognitive_overload',
  MOTIVATION_DECLINE = 'motivation_decline',
  SKILL_TRANSFER = 'skill_transfer',
  RETENTION_DECAY = 'retention_decay',
  LEARNING_RHYTHM = 'learning_rhythm',
  ATTENTION_SPAN = 'attention_span',
  DIFFICULTY_SENSITIVITY = 'difficulty_sensitivity',
  SOCIAL_INFLUENCE = 'social_influence',
  PERFECTIONISM = 'perfectionism',
  CRAMMING_BEHAVIOR = 'cramming_behavior',
  PROCRASTINATION = 'procrastination'
}

interface AdvancedLearningPattern extends LearningPattern {
  behavioralSignals: {
    signal: string;
    strength: number; // 0-1
    evidence: string[];
  }[];
  interventions: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  personalityFactors: string[];
}

export class AdvancedPatternRecognizer extends PatternRecognizer {
  private motivationBaseline = new Map<string, number>();
  private learningRhythms = new Map<string, any>();
  private skillTransferMap = new Map<string, any>();

  constructor(storage: EnhancedStorageService) {
    super(storage);
    this.initializeAdvancedDetectors();
  }

  async analyzeAdvancedPatterns(
    events: AnalyticsEvent[], 
    userId: string,
    timeframe = 7 * 24 * 60 * 60 * 1000 // 7 days
  ): Promise<AdvancedLearningPattern[]> {
    try {
      const recentEvents = events.filter(e => Date.now() - e.timestamp <= timeframe);
      const patterns: AdvancedLearningPattern[] = [];

      // Advanced behavioral pattern detection
      const momentumPattern = await this.detectLearningMomentumPattern(recentEvents, userId);
      if (momentumPattern) patterns.push(momentumPattern);

      const cognitivePattern = this.detectCognitiveOverloadPattern(recentEvents);
      if (cognitivePattern) patterns.push(cognitivePattern);

      const motivationPattern = await this.detectMotivationDeclinePattern(recentEvents, userId);
      if (motivationPattern) patterns.push(motivationPattern);

      const skillTransferPattern = this.detectSkillTransferPattern(recentEvents);
      if (skillTransferPattern) patterns.push(skillTransferPattern);

      const retentionPattern = await this.detectRetentionDecayPattern(recentEvents);
      if (retentionPattern) patterns.push(retentionPattern);

      const rhythmPattern = await this.detectLearningRhythmPattern(recentEvents, userId);
      if (rhythmPattern) patterns.push(rhythmPattern);

      const attentionPattern = this.detectAttentionSpanPattern(recentEvents);
      if (attentionPattern) patterns.push(attentionPattern);

      const perfectionismPattern = this.detectPerfectionismPattern(recentEvents);
      if (perfectionismPattern) patterns.push(perfectionismPattern);

      const crammingPattern = this.detectCrammingBehaviorPattern(recentEvents);
      if (crammingPattern) patterns.push(crammingPattern);

      return this.prioritizeAdvancedPatterns(patterns);
    } catch (error) {
      logger.error('Advanced pattern analysis failed', error);
      return [];
    }
  }

  /**
   * Detect learning momentum patterns - acceleration, deceleration, consistency
   */
  private async detectLearningMomentumPattern(events: AnalyticsEvent[], userId: string): Promise<AdvancedLearningPattern | null> {
    const successEvents = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS);
    if (successEvents.length < 10) return null;

    // Analyze learning velocity over time windows
    const timeWindows = this.createTimeWindows(successEvents, 3600000); // 1-hour windows
    const velocities = timeWindows.map(window => window.length);

    // Calculate momentum metrics
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityTrend = this.calculateTrend(velocities);
    const acceleration = velocities[velocities.length - 1] - velocities[0];
    const consistency = 1 - this.calculateVariance(velocities) / (avgVelocity + 1);

    let patternType: AdvancedPatternType;
    let description: string;
    let riskLevel: AdvancedLearningPattern['riskLevel'];
    let behavioralSignals: AdvancedLearningPattern['behavioralSignals'] = [];

    if (acceleration > 2 && velocityTrend > 0.1) {
      patternType = AdvancedPatternType.LEARNING_MOMENTUM;
      description = `Accelerating learning momentum: ${acceleration.toFixed(1)} words/hour increase`;
      riskLevel = 'low';
      behavioralSignals = [
        {
          signal: 'Increasing learning velocity',
          strength: Math.min(1, acceleration / 5),
          evidence: [`Velocity increased by ${acceleration.toFixed(1)} words/hour`, `Trend: ${(velocityTrend * 100).toFixed(1)}%`]
        },
        {
          signal: 'Consistent progress',
          strength: consistency,
          evidence: [`Consistency score: ${(consistency * 100).toFixed(1)}%`]
        }
      ];
    } else if (acceleration < -2 && velocityTrend < -0.1) {
      patternType = AdvancedPatternType.LEARNING_MOMENTUM;
      description = `Declining learning momentum: ${Math.abs(acceleration).toFixed(1)} words/hour decrease`;
      riskLevel = acceleration < -5 ? 'high' : 'medium';
      behavioralSignals = [
        {
          signal: 'Decreasing learning velocity',
          strength: Math.min(1, Math.abs(acceleration) / 5),
          evidence: [`Velocity decreased by ${Math.abs(acceleration).toFixed(1)} words/hour`, `Trend: ${(velocityTrend * 100).toFixed(1)}%`]
        }
      ];
    } else {
      return null;
    }

    return {
      id: `momentum_${userId}_${Date.now()}`,
      type: patternType as any,
      confidence: Math.min(0.9, velocities.length / 20),
      description,
      recommendations: this.generateMomentumRecommendations(acceleration, consistency),
      timeframe: {
        start: events[0].timestamp,
        end: Date.now()
      },
      behavioralSignals,
      interventions: this.generateMomentumInterventions(acceleration, riskLevel),
      riskLevel,
      personalityFactors: this.inferPersonalityFromMomentum(acceleration, consistency)
    };
  }

  /**
   * Detect cognitive overload patterns
   */
  private detectCognitiveOverloadPattern(events: AnalyticsEvent[]): AdvancedLearningPattern | null {
    const recentEvents = events.filter(e => Date.now() - e.timestamp <= 1800000); // Last 30 minutes
    if (recentEvents.length < 5) return null;

    const responseTimes = recentEvents
      .filter(e => e.data.responseTime)
      .map(e => e.data.responseTime);

    if (responseTimes.length < 3) return null;

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const responseTimeVariance = this.calculateVariance(responseTimes);
    const errorRate = this.calculateErrorRate(recentEvents);
    const hintsUsed = recentEvents.filter(e => e.type === AnalyticsEventType.HINT_USED).length;

    // Overload indicators
    const highResponseTime = avgResponseTime > 6000; // > 6 seconds
    const highVariance = responseTimeVariance > avgResponseTime * 0.8;
    const highErrorRate = errorRate > 0.5;
    const excessiveHints = hintsUsed > recentEvents.length * 0.4;

    const overloadSignals = [
      highResponseTime,
      highVariance,
      highErrorRate,
      excessiveHints
    ].filter(Boolean).length;

    if (overloadSignals < 2) return null;

    const severity = overloadSignals >= 3 ? 'critical' : 'high';

    return {
      id: `cognitive_overload_${Date.now()}`,
      type: AdvancedPatternType.COGNITIVE_OVERLOAD as any,
      confidence: 0.8 + (overloadSignals * 0.05),
      description: `Cognitive overload detected: ${overloadSignals}/4 stress indicators present`,
      recommendations: [
        'Take an immediate 5-10 minute break',
        'Switch to easier content or review mode',
        'Reduce session length for today',
        'Practice deep breathing or relaxation techniques'
      ],
      timeframe: {
        start: recentEvents[0].timestamp,
        end: Date.now()
      },
      behavioralSignals: [
        {
          signal: 'Elevated response times',
          strength: highResponseTime ? Math.min(1, avgResponseTime / 10000) : 0,
          evidence: [`Average response time: ${(avgResponseTime / 1000).toFixed(1)}s`]
        },
        {
          signal: 'Response time inconsistency',
          strength: highVariance ? Math.min(1, responseTimeVariance / avgResponseTime) : 0,
          evidence: [`Response time variance: ${(responseTimeVariance / 1000).toFixed(1)}s`]
        },
        {
          signal: 'Increased error rate',
          strength: errorRate,
          evidence: [`Error rate: ${(errorRate * 100).toFixed(1)}%`]
        },
        {
          signal: 'Excessive hint usage',
          strength: excessiveHints ? hintsUsed / recentEvents.length : 0,
          evidence: [`Hints used: ${hintsUsed}/${recentEvents.length} attempts`]
        }
      ],
      interventions: {
        immediate: [
          'Stop current session immediately',
          'Take a 10-minute break away from screen',
          'Do light physical movement or stretching'
        ],
        shortTerm: [
          'Return with easier content',
          'Limit session to 10-15 minutes',
          'Focus on review rather than new material'
        ],
        longTerm: [
          'Evaluate optimal session length',
          'Consider learning schedule adjustments',
          'Monitor stress levels and triggers'
        ]
      },
      riskLevel: severity as AdvancedLearningPattern['riskLevel'],
      personalityFactors: ['high-stress-sensitivity', 'perfectionist-tendencies']
    };
  }

  /**
   * Detect motivation decline patterns
   */
  private async detectMotivationDeclinePattern(events: AnalyticsEvent[], userId: string): Promise<AdvancedLearningPattern | null> {
    const sessionEvents = events.filter(e => 
      e.type === AnalyticsEventType.SESSION_START || 
      e.type === AnalyticsEventType.SESSION_END
    );

    if (sessionEvents.length < 6) return null; // Need at least 3 sessions

    // Analyze session patterns
    const sessions = this.groupEventsIntoSessions(sessionEvents);
    const sessionLengths = sessions.map(s => s.duration);
    const sessionGaps = this.calculateSessionGaps(sessions);

    // Calculate motivation indicators
    const avgSessionLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;
    const sessionLengthTrend = this.calculateTrend(sessionLengths);
    const avgSessionGap = sessionGaps.reduce((a, b) => a + b, 0) / sessionGaps.length;
    const sessionGapTrend = this.calculateTrend(sessionGaps);

    // Check for motivation decline signals
    const decliningSessionLength = sessionLengthTrend < -0.1;
    const increasingGaps = sessionGapTrend > 0.1;
    const shortSessions = avgSessionLength < 300000; // Less than 5 minutes
    const irregularSchedule = this.calculateVariance(sessionGaps) > avgSessionGap * 0.8;

    const motivationSignals = [
      decliningSessionLength,
      increasingGaps,
      shortSessions,
      irregularSchedule
    ].filter(Boolean).length;

    if (motivationSignals < 2) return null;

    // Store baseline for future comparison
    const currentMotivation = this.calculateMotivationScore(sessions);
    const previousBaseline = this.motivationBaseline.get(userId) || currentMotivation;
    const motivationChange = currentMotivation - previousBaseline;
    this.motivationBaseline.set(userId, currentMotivation);

    if (motivationChange > -0.2) return null; // No significant decline

    return {
      id: `motivation_decline_${userId}_${Date.now()}`,
      type: AdvancedPatternType.MOTIVATION_DECLINE as any,
      confidence: 0.7 + (motivationSignals * 0.05),
      description: `Motivation decline detected: ${(Math.abs(motivationChange) * 100).toFixed(1)}% decrease`,
      recommendations: [
        'Try a different learning activity or quiz mode',
        'Set smaller, achievable goals',
        'Focus on previously mastered content for confidence',
        'Consider learning with others or social features'
      ],
      timeframe: {
        start: sessions[0].startTime,
        end: Date.now()
      },
      behavioralSignals: [
        {
          signal: 'Declining session duration',
          strength: decliningSessionLength ? Math.abs(sessionLengthTrend) : 0,
          evidence: [`Session length trend: ${(sessionLengthTrend * 100).toFixed(1)}%`]
        },
        {
          signal: 'Increasing gaps between sessions',
          strength: increasingGaps ? sessionGapTrend : 0,
          evidence: [`Session gap trend: ${(sessionGapTrend * 100).toFixed(1)}%`]
        },
        {
          signal: 'Short session duration',
          strength: shortSessions ? 1 - (avgSessionLength / 900000) : 0,
          evidence: [`Average session: ${(avgSessionLength / 60000).toFixed(1)} minutes`]
        }
      ],
      interventions: {
        immediate: [
          'Switch to gamified content or achievements',
          'Try easier content to build confidence',
          'Set a small, achievable goal for today'
        ],
        shortTerm: [
          'Vary learning activities and quiz modes',
          'Connect with other learners or join challenges',
          'Celebrate small wins and progress milestones'
        ],
        longTerm: [
          'Reassess learning goals and motivations',
          'Consider learning style preferences',
          'Implement reward systems and habit tracking'
        ]
      },
      riskLevel: motivationSignals >= 3 ? 'high' : 'medium',
      personalityFactors: this.inferPersonalityFromMotivation(motivationSignals, sessions)
    };
  }

  /**
   * Detect perfectionism patterns
   */
  private detectPerfectionismPattern(events: AnalyticsEvent[]): AdvancedLearningPattern | null {
    const attemptEvents = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT);
    if (attemptEvents.length < 20) return null;

    // Analyze retry patterns
    const retryEvents = attemptEvents.filter(e => e.data.isRetry);
    const retryRate = retryEvents.length / attemptEvents.length;

    // Analyze response time patterns for deliberation
    const responseTimes = attemptEvents
      .filter(e => e.data.responseTime)
      .map(e => e.data.responseTime);

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const longDeliberationRate = responseTimes.filter(t => t > avgResponseTime * 2).length / responseTimes.length;

    // Analyze session abandonment after mistakes
    const sessionEnds = events.filter(e => e.type === AnalyticsEventType.SESSION_END);
    const abruptEnds = sessionEnds.filter(e => {
      const recentMistakes = events.filter(mistake => 
        mistake.type === AnalyticsEventType.WORD_MISTAKE && 
        Math.abs(mistake.timestamp - e.timestamp) < 60000 // Within 1 minute
      );
      return recentMistakes.length > 0;
    });

    const perfectionismIndicators = [
      retryRate > 0.3, // High retry rate
      longDeliberationRate > 0.4, // Long deliberation times
      abruptEnds.length > sessionEnds.length * 0.3, // Quitting after mistakes
      avgResponseTime > 5000 // Generally slow responses (overthinking)
    ].filter(Boolean).length;

    if (perfectionismIndicators < 2) return null;

    return {
      id: `perfectionism_${Date.now()}`,
      type: AdvancedPatternType.PERFECTIONISM as any,
      confidence: 0.6 + (perfectionismIndicators * 0.1),
      description: `Perfectionist learning pattern detected: ${perfectionismIndicators}/4 indicators present`,
      recommendations: [
        'Embrace mistakes as part of learning',
        'Set time limits for responses to reduce overthinking',
        'Focus on progress over perfection',
        'Practice "good enough" responses for flow'
      ],
      timeframe: {
        start: events[0].timestamp,
        end: Date.now()
      },
      behavioralSignals: [
        {
          signal: 'High retry rate',
          strength: retryRate,
          evidence: [`Retry rate: ${(retryRate * 100).toFixed(1)}%`]
        },
        {
          signal: 'Long deliberation times',
          strength: longDeliberationRate,
          evidence: [`Deliberation rate: ${(longDeliberationRate * 100).toFixed(1)}%`]
        },
        {
          signal: 'Session abandonment after mistakes',
          strength: abruptEnds.length / Math.max(1, sessionEnds.length),
          evidence: [`Abrupt endings: ${abruptEnds.length}/${sessionEnds.length} sessions`]
        }
      ],
      interventions: {
        immediate: [
          'Set response time limits',
          'Practice "first instinct" responses',
          'Celebrate partial credit and near-misses'
        ],
        shortTerm: [
          'Focus on fluency over accuracy',
          'Track mistakes as learning opportunities',
          'Use timer-based practice sessions'
        ],
        longTerm: [
          'Work on growth mindset development',
          'Practice deliberate error-making exercises',
          'Build tolerance for imperfection'
        ]
      },
      riskLevel: perfectionismIndicators >= 3 ? 'medium' : 'low',
      personalityFactors: ['perfectionist', 'high-self-standards', 'overthinking-tendency']
    };
  }

  private detectSkillTransferPattern(events: AnalyticsEvent[]): AdvancedLearningPattern | null {
    // Implementation for skill transfer detection
    return null;
  }

  private async detectRetentionDecayPattern(events: AnalyticsEvent[]): Promise<AdvancedLearningPattern | null> {
    // Implementation for retention decay detection
    return null;
  }

  private async detectLearningRhythmPattern(events: AnalyticsEvent[], userId: string): Promise<AdvancedLearningPattern | null> {
    // Implementation for learning rhythm detection
    return null;
  }

  private detectAttentionSpanPattern(events: AnalyticsEvent[]): AdvancedLearningPattern | null {
    // Implementation for attention span detection
    return null;
  }

  private detectCrammingBehaviorPattern(events: AnalyticsEvent[]): AdvancedLearningPattern | null {
    // Implementation for cramming behavior detection
    return null;
  }

  // Helper methods
  private initializeAdvancedDetectors(): void {
    // Initialize advanced pattern detectors
  }

  private createTimeWindows(events: AnalyticsEvent[], windowSize: number): AnalyticsEvent[][] {
    const windows: AnalyticsEvent[][] = [];
    const startTime = events[0]?.timestamp || Date.now();
    const endTime = events[events.length - 1]?.timestamp || Date.now();
    
    for (let time = startTime; time <= endTime; time += windowSize) {
      const windowEvents = events.filter(e => 
        e.timestamp >= time && e.timestamp < time + windowSize
      );
      if (windowEvents.length > 0) {
        windows.push(windowEvents);
      }
    }
    
    return windows;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope / (sumY / n); // Normalized slope
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateErrorRate(events: AnalyticsEvent[]): number {
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const mistakes = events.filter(e => e.type === AnalyticsEventType.WORD_MISTAKE).length;
    return attempts > 0 ? mistakes / attempts : 0;
  }

  private groupEventsIntoSessions(events: AnalyticsEvent[]): any[] {
    // Implementation for grouping events into sessions
    return [];
  }

  private calculateSessionGaps(sessions: any[]): number[] {
    // Implementation for calculating gaps between sessions
    return [];
  }

  private calculateMotivationScore(sessions: any[]): number {
    // Implementation for calculating motivation score
    return 0.5;
  }

  private generateMomentumRecommendations(acceleration: number, consistency: number): string[] {
    if (acceleration > 0) {
      return [
        'Excellent momentum! Consider increasing difficulty slightly',
        'Maintain current learning schedule',
        'Set higher goals to match your progress'
      ];
    } else {
      return [
        'Take a short break to refresh motivation',
        'Review easier content to build confidence',
        'Consider adjusting learning schedule or environment'
      ];
    }
  }

  private generateMomentumInterventions(acceleration: number, riskLevel: string): AdvancedLearningPattern['interventions'] {
    return {
      immediate: acceleration > 0 ? ['Continue current approach'] : ['Take a motivational break'],
      shortTerm: acceleration > 0 ? ['Gradually increase challenge'] : ['Focus on review and confidence building'],
      longTerm: acceleration > 0 ? ['Set ambitious learning goals'] : ['Reassess learning strategy and goals']
    };
  }

  private inferPersonalityFromMomentum(acceleration: number, consistency: number): string[] {
    const factors: string[] = [];
    
    if (acceleration > 2) factors.push('fast-learner', 'goal-oriented');
    if (acceleration < -2) factors.push('easily-discouraged', 'motivation-sensitive');
    if (consistency > 0.8) factors.push('disciplined', 'consistent');
    if (consistency < 0.4) factors.push('irregular', 'mood-dependent');
    
    return factors;
  }

  private inferPersonalityFromMotivation(signals: number, sessions: any[]): string[] {
    const factors: string[] = [];
    
    if (signals >= 3) factors.push('motivation-sensitive', 'external-validation-seeking');
    if (sessions.length > 0) {
      const avgLength = sessions.reduce((sum: number, s: any) => sum + s.duration, 0) / sessions.length;
      if (avgLength < 300000) factors.push('short-attention-span');
      if (avgLength > 1800000) factors.push('deep-focus-capable');
    }
    
    return factors;
  }

  private prioritizeAdvancedPatterns(patterns: AdvancedLearningPattern[]): AdvancedLearningPattern[] {
    return patterns.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = riskOrder[a.riskLevel] * a.confidence;
      const bScore = riskOrder[b.riskLevel] * b.confidence;
      return bScore - aScore;
    });
  }
}