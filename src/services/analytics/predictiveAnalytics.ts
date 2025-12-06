/**
 * Predictive Analytics Engine
 * AI-driven learning predictions and optimization recommendations
 */

import {
  IPredictiveAnalytics,
  AnalyticsEvent,
  AnalyticsEventType,
  Prediction,
  PredictionContext,
  LearningRecommendation,
  LearningMetrics,
  PredictionType,
} from './interfaces';
import { EnhancedStorageService } from '../storage/enhancedStorage';
import { logger } from '../logger';

interface ModelFeatures {
  accuracy: number;
  responseTime: number;
  streakLength: number;
  sessionDuration: number;
  hintsUsed: number;
  difficultyLevel: number;
  timeOfDay: number;
  dayOfWeek: number;
  engagementScore: number;
}

interface PredictionModel {
  type: PredictionType;
  features: string[];
  weights: number[];
  bias: number;
  accuracy: number;
  lastTrained: number;
  dataPoints: number;
}

export class PredictiveAnalytics implements IPredictiveAnalytics {
  private models = new Map<PredictionType, PredictionModel>();
  private featureCache = new Map<string, ModelFeatures>();
  private predictionCache = new Map<string, { prediction: Prediction; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MIN_DATA_POINTS = 50;

  constructor(private storage: EnhancedStorageService) {
    this.initializeModels();
    this.loadTrainedModels();
  }

  async generatePredictions(userId: string, context: PredictionContext): Promise<Prediction[]> {
    const cacheKey = `pred_${userId}_${JSON.stringify(context)}`;
    const cached = this.predictionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return [cached.prediction];
    }

    try {
      const features = await this.extractFeatures(userId, context);
      const predictions: Prediction[] = [];

      // Generate predictions for each model type
      for (const [type, model] of this.models) {
        if (this.shouldGeneratePrediction(model, features)) {
          const prediction = await this.makePrediction(type, features, context);
          if (prediction) {
            predictions.push(prediction);
          }
        }
      }

      // Cache the primary prediction
      if (predictions.length > 0) {
        this.predictionCache.set(cacheKey, {
          prediction: predictions[0],
          timestamp: Date.now(),
        });
      }

      return predictions.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error('Prediction generation failed', error);
      return [];
    }
  }

  async optimizeLearningPath(
    userId: string,
    currentMetrics: LearningMetrics
  ): Promise<LearningRecommendation[]> {
    try {
      const context: PredictionContext = {
        userId,
        currentLevel: currentMetrics.masteryLevel,
        sessionTime: Date.now(),
        recentPerformance: currentMetrics,
      };

      const predictions = await this.generatePredictions(userId, context);
      const recommendations: LearningRecommendation[] = [];

      // Difficulty optimization
      const difficultyPrediction = predictions.find(
        p => p.type === PredictionType.OPTIMAL_DIFFICULTY
      );
      if (difficultyPrediction) {
        recommendations.push({
          type: 'difficulty_adjustment',
          priority: 'high',
          action: 'adjust_difficulty',
          value: difficultyPrediction.value,
          reasoning: difficultyPrediction.reasoning,
          confidence: difficultyPrediction.confidence,
          expectedImprovement: this.calculateExpectedImprovement(difficultyPrediction),
        });
      }

      // Session length optimization
      const sessionPrediction = predictions.find(p => p.type === PredictionType.SESSION_LENGTH);
      if (sessionPrediction) {
        recommendations.push({
          type: 'session_optimization',
          priority: 'medium',
          action: 'adjust_session_length',
          value: sessionPrediction.value,
          reasoning: sessionPrediction.reasoning,
          confidence: sessionPrediction.confidence,
          expectedImprovement: this.calculateExpectedImprovement(sessionPrediction),
        });
      }

      // Content recommendations
      const contentPredictions = predictions.filter(
        p => p.type === PredictionType.CONTENT_RECOMMENDATION
      );
      for (const prediction of contentPredictions) {
        recommendations.push({
          type: 'content_suggestion',
          priority: 'medium',
          action: 'focus_content',
          value: prediction.value,
          reasoning: prediction.reasoning,
          confidence: prediction.confidence,
          expectedImprovement: this.calculateExpectedImprovement(prediction),
        });
      }

      // Time optimization
      const timePrediction = predictions.find(p => p.type === PredictionType.OPTIMAL_TIME);
      if (timePrediction) {
        recommendations.push({
          type: 'timing_optimization',
          priority: 'low',
          action: 'suggest_time_slots',
          value: timePrediction.value,
          reasoning: timePrediction.reasoning,
          confidence: timePrediction.confidence,
          expectedImprovement: this.calculateExpectedImprovement(timePrediction),
        });
      }

      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      logger.error('Learning path optimization failed', error);
      return [];
    }
  }

  async trainModel(type: PredictionType, trainingData: AnalyticsEvent[]): Promise<void> {
    try {
      if (trainingData.length < this.MIN_DATA_POINTS) {
        logger.warn(`Insufficient data for training ${type} model: ${trainingData.length} points`);
        return;
      }

      const model = this.models.get(type);
      if (!model) {
        logger.error(`Model ${type} not found`);
        return;
      }

      // Extract features and labels from training data
      const { features, labels } = await this.prepareTrainingData(trainingData, type);

      // Train using simple linear regression with regularization
      const trainedWeights = this.trainLinearModel(features, labels, model.weights);

      // Update model
      model.weights = trainedWeights.weights;
      model.bias = trainedWeights.bias;
      model.accuracy = await this.validateModel(model, features, labels);
      model.lastTrained = Date.now();
      model.dataPoints = trainingData.length;

      this.models.set(type, model);

      // Persist model
      await this.saveModel(type, model);

      logger.info(`Model ${type} trained with accuracy: ${model.accuracy.toFixed(3)}`);
    } catch (error) {
      logger.error(`Model training failed for ${type}`, error);
    }
  }

  private async extractFeatures(
    userId: string,
    context: PredictionContext
  ): Promise<ModelFeatures> {
    const cacheKey = `features_${userId}_${context.sessionTime}`;
    const cached = this.featureCache.get(cacheKey);

    if (cached) return cached;

    try {
      // Get recent user data
      const recentEvents = await this.getRecentEvents(userId, 24 * 60 * 60 * 1000); // Last 24 hours
      const sessionEvents = recentEvents.filter(e => e.sessionId === context.sessionId);

      // Calculate features
      const features: ModelFeatures = {
        accuracy: this.calculateAccuracy(sessionEvents),
        responseTime: this.calculateAverageResponseTime(sessionEvents),
        streakLength: this.calculateCurrentStreak(sessionEvents),
        sessionDuration: this.calculateSessionDuration(sessionEvents),
        hintsUsed: this.countHintsUsed(sessionEvents),
        difficultyLevel: context.currentLevel || 1,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        engagementScore: this.calculateEngagementScore(sessionEvents),
      };

      this.featureCache.set(cacheKey, features);
      return features;
    } catch (error) {
      logger.error('Feature extraction failed', error);
      return this.getDefaultFeatures();
    }
  }

  private async makePrediction(
    type: PredictionType,
    features: ModelFeatures,
    _context: PredictionContext
  ): Promise<Prediction | null> {
    const model = this.models.get(type);
    if (!model || model.accuracy < 0.6) {
      return null; // Model not reliable enough
    }

    try {
      // Convert features to array
      const featureVector = this.featuresToVector(features, model.features);

      // Calculate prediction using linear model
      let prediction = model.bias;
      for (let i = 0; i < model.weights.length; i++) {
        prediction += model.weights[i] * featureVector[i];
      }

      // Apply activation function based on prediction type
      const normalizedValue = this.applyActivation(prediction, type);

      // Calculate confidence based on model accuracy and feature quality
      const confidence = this.calculatePredictionConfidence(model, features, normalizedValue);

      // Generate reasoning
      const reasoning = this.generateReasoning(type, features, normalizedValue, model);

      return {
        type,
        value: normalizedValue,
        confidence,
        reasoning,
        timestamp: Date.now(),
        context: {
          modelAccuracy: model.accuracy,
          featureQuality: this.assessFeatureQuality(features),
          dataPoints: model.dataPoints,
        },
      };
    } catch (error) {
      logger.error(`Prediction failed for ${type}`, error);
      return null;
    }
  }

  private trainLinearModel(
    features: number[][],
    labels: number[],
    initialWeights: number[]
  ): { weights: number[]; bias: number } {
    const learningRate = 0.01;
    const regularization = 0.001;
    const epochs = 1000;

    const weights = [...initialWeights];
    let bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalError = 0;
      const weightGradients = new Array(weights.length).fill(0);
      let biasGradient = 0;

      // Calculate gradients
      for (let i = 0; i < features.length; i++) {
        const predicted = bias + features[i].reduce((sum, f, j) => sum + f * weights[j], 0);
        const error = predicted - labels[i];
        totalError += error * error;

        // Update gradients
        biasGradient += error;
        for (let j = 0; j < weights.length; j++) {
          weightGradients[j] += error * features[i][j] + regularization * weights[j];
        }
      }

      // Update weights and bias
      bias -= (learningRate * biasGradient) / features.length;
      for (let j = 0; j < weights.length; j++) {
        weights[j] -= (learningRate * weightGradients[j]) / features.length;
      }

      // Early stopping if converged
      if (totalError / features.length < 0.001) break;
    }

    return { weights, bias };
  }

  private initializeModels(): void {
    const modelConfigs: Array<{ type: PredictionType; features: string[] }> = [
      {
        type: PredictionType.PERFORMANCE_FORECAST,
        features: ['accuracy', 'responseTime', 'streakLength', 'sessionDuration', 'timeOfDay'],
      },
      {
        type: PredictionType.OPTIMAL_DIFFICULTY,
        features: ['accuracy', 'responseTime', 'streakLength', 'hintsUsed', 'engagementScore'],
      },
      {
        type: PredictionType.SESSION_LENGTH,
        features: ['sessionDuration', 'engagementScore', 'accuracy', 'timeOfDay', 'dayOfWeek'],
      },
      {
        type: PredictionType.CONTENT_RECOMMENDATION,
        features: ['accuracy', 'hintsUsed', 'difficultyLevel', 'engagementScore'],
      },
      {
        type: PredictionType.OPTIMAL_TIME,
        features: ['timeOfDay', 'dayOfWeek', 'accuracy', 'engagementScore', 'sessionDuration'],
      },
    ];

    for (const config of modelConfigs) {
      this.models.set(config.type, {
        type: config.type,
        features: config.features,
        weights: new Array(config.features.length).fill(0.1),
        bias: 0,
        accuracy: 0.5,
        lastTrained: 0,
        dataPoints: 0,
      });
    }
  }

  // Helper methods for calculations
  private calculateAccuracy(events: AnalyticsEvent[]): number {
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const successes = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length;
    return attempts > 0 ? successes / attempts : 0;
  }

  private calculateAverageResponseTime(events: AnalyticsEvent[]): number {
    const responseTimes = events
      .filter(e => e.type === AnalyticsEventType.RESPONSE_TIME)
      .map(e => e.data.responseTime as number)
      .filter(time => time > 0);

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 5000;
  }

  private calculateCurrentStreak(events: AnalyticsEvent[]): number {
    let streak = 0;
    const orderedEvents = events
      .filter(e =>
        [AnalyticsEventType.WORD_SUCCESS, AnalyticsEventType.WORD_FAILURE].includes(e.type)
      )
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const event of orderedEvents) {
      if (event.type === AnalyticsEventType.WORD_SUCCESS) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateSessionDuration(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;

    const timestamps = events.map(e => e.timestamp);
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  private countHintsUsed(events: AnalyticsEvent[]): number {
    return events.filter(e => e.type === AnalyticsEventType.HINT_USED).length;
  }

  private calculateEngagementScore(events: AnalyticsEvent[]): number {
    // Simplified engagement calculation
    const totalEvents = events.length;
    const pauseEvents = events.filter(e => e.type === AnalyticsEventType.PAUSE_SESSION).length;
    const skipEvents = events.filter(e => e.type === AnalyticsEventType.SKIP_WORD).length;

    if (totalEvents === 0) return 0.5;

    const engagementRatio = 1 - (pauseEvents + skipEvents) / totalEvents;
    return Math.max(0, Math.min(1, engagementRatio));
  }

  private featuresToVector(features: ModelFeatures, featureNames: string[]): number[] {
    return featureNames.map(name => {
      const value = features[name as keyof ModelFeatures];
      return typeof value === 'number' ? value : 0;
    });
  }

  private applyActivation(value: number, type: PredictionType): number {
    switch (type) {
      case PredictionType.OPTIMAL_DIFFICULTY:
        return Math.max(1, Math.min(10, Math.round(value))); // 1-10 scale
      case PredictionType.SESSION_LENGTH:
        return Math.max(300000, Math.min(1800000, value)); // 5-30 minutes in ms
      case PredictionType.PERFORMANCE_FORECAST:
        return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-value)))); // Sigmoid 0-1
      default:
        return value;
    }
  }

  private calculatePredictionConfidence(
    model: PredictionModel,
    features: ModelFeatures,
    _prediction: number
  ): number {
    const baseConfidence = model.accuracy;
    const featureQuality = this.assessFeatureQuality(features);
    const dataQuality = Math.min(1, model.dataPoints / 1000); // More data = higher confidence

    return baseConfidence * 0.5 + featureQuality * 0.3 + dataQuality * 0.2;
  }

  private assessFeatureQuality(features: ModelFeatures): number {
    // Simple heuristic for feature quality
    const scores: number[] = Object.values(features).map(value => {
      if (typeof value !== 'number' || isNaN(value)) return 0;
      if (value < 0 || value > 1000000) return 0.3; // Outliers
      return 1;
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private generateReasoning(
    type: PredictionType,
    features: ModelFeatures,
    _prediction: number,
    model: PredictionModel
  ): string[] {
    const reasoning: string[] = [];

    switch (type) {
      case PredictionType.OPTIMAL_DIFFICULTY:
        if (features.accuracy > 0.8) {
          reasoning.push('High accuracy suggests you can handle increased difficulty');
        }
        if (features.hintsUsed > 3) {
          reasoning.push('Frequent hint usage indicates current difficulty may be appropriate');
        }
        break;

      case PredictionType.SESSION_LENGTH:
        if (features.engagementScore > 0.7) {
          reasoning.push('High engagement suggests longer sessions may be beneficial');
        }
        if (features.sessionDuration > 600000) {
          reasoning.push('Current session length shows good focus capacity');
        }
        break;

      default:
        reasoning.push(
          `Prediction based on ${model.dataPoints} data points with ${(model.accuracy * 100).toFixed(1)}% accuracy`
        );
    }

    return reasoning;
  }

  private shouldGeneratePrediction(model: PredictionModel, features: ModelFeatures): boolean {
    return (
      model.accuracy > 0.5 &&
      model.dataPoints >= this.MIN_DATA_POINTS &&
      this.assessFeatureQuality(features) > 0.6
    );
  }

  private calculateExpectedImprovement(prediction: Prediction): number {
    // Simple heuristic for expected improvement based on confidence and prediction type
    const baseImprovement = prediction.confidence * 0.2; // Max 20% improvement

    switch (prediction.type) {
      case PredictionType.OPTIMAL_DIFFICULTY:
        return baseImprovement * 1.5; // Difficulty adjustments can have high impact
      case PredictionType.SESSION_LENGTH:
        return baseImprovement * 1.2;
      default:
        return baseImprovement;
    }
  }

  private getDefaultFeatures(): ModelFeatures {
    return {
      accuracy: 0.7,
      responseTime: 5000,
      streakLength: 3,
      sessionDuration: 600000,
      hintsUsed: 2,
      difficultyLevel: 5,
      timeOfDay: 14,
      dayOfWeek: 3,
      engagementScore: 0.7,
    };
  }

  // Data loading and persistence methods
  private async getRecentEvents(userId: string, timeframe: number): Promise<AnalyticsEvent[]> {
    try {
      return (
        (await this.storage.loadAnalyticsEvents({
          userId,
          timeRange: { start: Date.now() - timeframe, end: Date.now() },
        })) || []
      );
    } catch {
      return [];
    }
  }

  private async prepareTrainingData(
    _events: AnalyticsEvent[],
    _type: PredictionType
  ): Promise<{ features: number[][]; labels: number[] }> {
    // This would implement data preparation logic specific to each prediction type
    // For now, returning mock structure
    return { features: [], labels: [] };
  }

  private async validateModel(
    _model: PredictionModel,
    _features: number[][],
    _labels: number[]
  ): Promise<number> {
    // Cross-validation implementation would go here
    return 0.75; // Mock accuracy
  }

  private async loadTrainedModels(): Promise<void> {
    // Load previously trained models from storage
    try {
      const savedModels = await this.storage.loadAnalyticsModels();
      if (savedModels) {
        for (const [type, model] of Object.entries(savedModels)) {
          this.models.set(type as PredictionType, model as PredictionModel);
        }
      }
    } catch (error) {
      logger.warn('Failed to load trained models, using defaults', error);
    }
  }

  private async saveModel(type: PredictionType, model: PredictionModel): Promise<void> {
    try {
      await this.storage.saveAnalyticsModel(type, model);
    } catch (error) {
      logger.error(`Failed to save model ${type}`, error);
    }
  }
}
