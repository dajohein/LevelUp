/**
 * Phase 2: Analytics Enhancement - Core Interfaces
 * Advanced analytics system built on Phase 1 enhanced storage
 */

// Core Analytics Types
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
  data: Record<string, any>;
  metadata?: {
    version: string;
    platform: string;
    userAgent?: string;
  };
}

export enum AnalyticsEventType {
  // Learning Events
  WORD_ATTEMPT = 'word_attempt',
  WORD_SUCCESS = 'word_success',
  WORD_FAILURE = 'word_failure',
  WORD_MISTAKE = 'word_mistake',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  LEVEL_UP = 'level_up',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  
  // Behavioral Events
  PAUSE_SESSION = 'pause_session',
  RESUME_SESSION = 'resume_session',
  SKIP_WORD = 'skip_word',
  HINT_USED = 'hint_used',
  RETRY_WORD = 'retry_word',
  
  // Performance Events
  RESPONSE_TIME = 'response_time',
  ACCURACY_MEASUREMENT = 'accuracy_measurement',
  STREAK_ACHIEVEMENT = 'streak_achievement',
  
  // Navigation Events
  MODULE_SWITCH = 'module_switch',
  LANGUAGE_SWITCH = 'language_switch',
  SETTINGS_CHANGE = 'settings_change'
}

// Real-time Metrics
export interface RealTimeMetrics {
  sessionMetrics: SessionMetrics;
  learningMetrics: LearningMetrics;
  performanceMetrics: PerformanceMetrics;
  behavioralMetrics: BehavioralMetrics;
}

export interface SessionMetrics {
  duration: number;
  wordsAttempted: number;
  wordsCompleted: number;
  accuracy: number;
  streakCount: number;
  pauseCount: number;
  hintsUsed: number;
}

export interface LearningMetrics {
  averageResponseTime: number;
  difficultyProgression: number;
  retentionRate: number;
  masteryLevel: number;
  weakAreas: string[];
  strongAreas: string[];
}

export interface PerformanceMetrics {
  wordsPerMinute: number;
  errorRate: number;
  improvementRate: number;
  consistencyScore: number;
  peakPerformanceTime: number;
}

export interface BehavioralMetrics {
  engagementScore: number;
  persistenceLevel: number;
  learningStyle: LearningStyle;
  preferredDifficulty: number;
  sessionPattern: SessionPattern;
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing',
  MIXED = 'mixed'
}

export enum SessionPattern {
  SHORT_FREQUENT = 'short_frequent',
  LONG_INTENSIVE = 'long_intensive',
  MIXED = 'mixed',
  IRREGULAR = 'irregular'
}

// Pattern Recognition
export interface LearningPattern {
  id: string;
  type: PatternType;
  confidence: number;
  description: string;
  recommendations: string[];
  affectedWords?: string[];
  timeframe: {
    start: number;
    end: number;
  };
}

export enum PatternType {
  DIFFICULTY_SPIKE = 'difficulty_spike',
  LEARNING_PLATEAU = 'learning_plateau',
  RAPID_IMPROVEMENT = 'rapid_improvement',
  CONSISTENCY_DROP = 'consistency_drop',
  TIME_PREFERENCE = 'time_preference',
  TOPIC_AFFINITY = 'topic_affinity',
  FORGETTING_CURVE = 'forgetting_curve'
}

// Predictive Analytics
export interface PredictionModel {
  type: PredictionType;
  accuracy: number;
  lastTrained: number;
  features: string[];
  predictions: Prediction[];
}

export interface Prediction {
  type: PredictionType;
  value: any;
  confidence: number;
  reasoning: string[];
  timestamp: number;
  timeframe?: number;
  factors?: PredictionFactor[];
  context?: Record<string, any>;
}

export interface PredictionFactor {
  name: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum PredictionType {
  PERFORMANCE_FORECAST = 'performance_forecast',
  OPTIMAL_DIFFICULTY = 'optimal_difficulty',
  SESSION_LENGTH = 'session_length',
  CONTENT_RECOMMENDATION = 'content_recommendation',
  OPTIMAL_TIME = 'optimal_time',
  WORD_MASTERY_TIME = 'word_mastery_time',
  SESSION_SUCCESS_RATE = 'session_success_rate',
  RETENTION_LIKELIHOOD = 'retention_likelihood'
}

// Analytics Services Interfaces
export interface IAnalyticsCollector {
  trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void>;
  trackMetric(metric: string, value: number, tags?: Record<string, string>): Promise<void>;
  flush(): Promise<void>;
}

export interface IMetricsCalculator {
  calculateRealTimeMetrics(events: AnalyticsEvent[]): RealTimeMetrics;
  updateSessionMetrics(event: AnalyticsEvent): SessionMetrics;
  calculateLearningProgress(userId: string, timeframe?: number): Promise<LearningMetrics>;
}

export interface IPatternRecognizer {
  analyzePatterns(events: AnalyticsEvent[], timeframe?: number): Promise<LearningPattern[]>;
  detectAnomalies(metrics: RealTimeMetrics): Promise<LearningPattern[]>;
  updatePatternModels(newData: AnalyticsEvent[]): Promise<void>;
}

export interface IPredictiveAnalytics {
  generatePredictions(userId: string, context: PredictionContext): Promise<Prediction[]>;
  trainModel(type: PredictionType, trainingData: AnalyticsEvent[]): Promise<void>;
  optimizeLearningPath(userId: string, currentProgress: LearningMetrics): Promise<LearningRecommendation[]>;
}

export interface PredictionContext {
  userId: string;
  sessionId?: string;
  currentLevel?: number;
  sessionTime: number;
  recentPerformance?: any;
  currentSession?: SessionMetrics;
  learningHistory?: LearningMetrics;
  timeOfDay?: number;
  dayOfWeek?: number;
}

export interface LearningRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  action: string;
  value: any;
  reasoning: string[];
  confidence: number;
  expectedImprovement: number;
}

export enum RecommendationType {
  DIFFICULTY_ADJUSTMENT = 'difficulty_adjustment',
  BREAK_SUGGESTION = 'break_suggestion',
  REVIEW_WORDS = 'review_words',
  FOCUS_AREA = 'focus_area',
  SESSION_LENGTH = 'session_length',
  PRACTICE_TIME = 'practice_time'
}

// Analytics Configuration
export interface AnalyticsConfig {
  enabled: boolean;
  realTimeUpdates: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  anonymizeData: boolean;
  enablePredictions: boolean;
  patternDetection: {
    enabled: boolean;
    sensitivity: number;
    minConfidence: number;
  };
  performance: {
    maxEventsInMemory: number;
    compressionEnabled: boolean;
    backgroundProcessing: boolean;
  };
}

// Results and Reporting
export interface AnalyticsReport {
  id: string;
  type: ReportType;
  period: {
    start: number;
    end: number;
  };
  data: {
    summary: AnalyticsSummary;
    trends: TrendAnalysis[];
    insights: AnalyticsInsight[];
    recommendations: LearningRecommendation[];
  };
  generatedAt: number;
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalWords: number;
  averageAccuracy: number;
  totalStudyTime: number;
  improvementRate: number;
  achievementsUnlocked: number;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  significance: number;
  timeframe: number;
}

export interface AnalyticsInsight {
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  relatedMetrics: string[];
}

export enum InsightType {
  PERFORMANCE_IMPROVEMENT = 'performance_improvement',
  LEARNING_EFFICIENCY = 'learning_efficiency',
  ENGAGEMENT_PATTERN = 'engagement_pattern',
  DIFFICULTY_OPTIMIZATION = 'difficulty_optimization',
  TIME_OPTIMIZATION = 'time_optimization'
}

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
  REAL_TIME = 'real_time'
}

// Error Handling
export interface AnalyticsError extends Error {
  type: AnalyticsErrorType;
  context?: Record<string, any>;
  recoverable: boolean;
}

export enum AnalyticsErrorType {
  COLLECTION_FAILED = 'collection_failed',
  CALCULATION_ERROR = 'calculation_error',
  PATTERN_DETECTION_FAILED = 'pattern_detection_failed',
  PREDICTION_ERROR = 'prediction_error',
  STORAGE_ERROR = 'storage_error',
  INVALID_DATA = 'invalid_data'
}