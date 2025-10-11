/**
 * AI Learning Coach Hook
 * Real-time AI guidance integration for game sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AILearningCoach, LearningCoachInsight } from '../services/ai/learningCoach';
import { AdvancedPatternRecognizer } from '../services/ai/advancedPatternRecognizer';
import { AdvancedMLModels } from '../services/ai/advancedMLModels';
import { enhancedStorage } from '../services/storage/enhancedStorage';
import { EnhancedAnalyticsService } from '../services/analytics/enhancedAnalytics';
import { AnalyticsEvent, AnalyticsEventType } from '../services/analytics/interfaces';

interface AICoachState {
  insights: LearningCoachInsight[];
  isActive: boolean;
  shouldIntervene: boolean;
  intervention?: any;
  realTimeMetrics: {
    learningMomentum: number;
    cognitiveLoad: string;
    engagementScore: number;
    churnRisk: number;
  };
  personalizedGuidance: {
    nextWordSuggestions: string[];
    difficultyAdjustment: number;
    sessionLengthRecommendation: number;
    learningStrategy: string;
  };
}

interface UseAILearningCoachOptions {
  userId: string;
  languageCode: string;
  sessionId?: string;
  enableRealTimeInterventions?: boolean;
  interventionThreshold?: number;
  updateInterval?: number;
}

export const useAILearningCoach = (options: UseAILearningCoachOptions) => {
  const {
    userId,
    languageCode,
    sessionId,
    enableRealTimeInterventions = true,
    interventionThreshold = 0.7,
    updateInterval = 10000 // 10 seconds
  } = options;

  const [state, setState] = useState<AICoachState>({
    insights: [],
    isActive: false,
    shouldIntervene: false,
    realTimeMetrics: {
      learningMomentum: 0,
      cognitiveLoad: 'optimal',
      engagementScore: 0.8,
      churnRisk: 0.3
    },
    personalizedGuidance: {
      nextWordSuggestions: [],
      difficultyAdjustment: 0,
      sessionLengthRecommendation: 900000, // 15 minutes
      learningStrategy: 'balanced'
    }
  });

  // AI service instances
  const aiCoachRef = useRef<AILearningCoach | null>(null);
  const patternRecognizerRef = useRef<AdvancedPatternRecognizer | null>(null);
  const mlModelsRef = useRef<AdvancedMLModels | null>(null);
  const analyticsRef = useRef<any>(null);

  // Session tracking
  const sessionEventsRef = useRef<AnalyticsEvent[]>([]);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastInterventionRef = useRef<number>(0);

  // Initialize AI services
  useEffect(() => {
    const analyticsConfig = {
      enabled: true,
      realTimeUpdates: true,
      batchSize: 100,
      flushInterval: 5000,
      retentionDays: 90,
      anonymizeData: false,
      enablePredictions: true,
      patternDetection: {
        enabled: true,
        sensitivity: 0.7,
        minConfidence: 0.6
      },
      performance: {
        maxEventsInMemory: 10000,
        compressionEnabled: true,
        backgroundProcessing: true
      }
    };
    const analytics = new EnhancedAnalyticsService(enhancedStorage, analyticsConfig);
    const patternRecognizer = new AdvancedPatternRecognizer(enhancedStorage);
    const mlModels = new AdvancedMLModels(enhancedStorage);
    const aiCoach = new AILearningCoach(enhancedStorage, patternRecognizer as any, mlModels as any);

    aiCoachRef.current = aiCoach;
    patternRecognizerRef.current = patternRecognizer;
    mlModelsRef.current = mlModels;
    analyticsRef.current = analytics;

    setState(prev => ({ ...prev, isActive: true }));
  }, []);

  // Track learning events for real-time analysis
  const trackLearningEvent = useCallback((eventType: AnalyticsEventType, data: any) => {
    const event: AnalyticsEvent = {
      id: `${Date.now()}_${Math.random()}`,
      type: eventType,
      timestamp: Date.now(),
      userId,
      sessionId: sessionId || 'current_session',
      data: {
        languageCode,
        ...data
      }
    };

    sessionEventsRef.current.push(event);

    // Track with analytics service
    if (analyticsRef.current) {
      analyticsRef.current.trackEvent(eventType, data, userId);
    }
  }, [userId, languageCode, sessionId]);

  // Real-time analysis and intervention detection
  const performRealTimeAnalysis = useCallback(async () => {
    if (!aiCoachRef.current || !state.isActive || sessionEventsRef.current.length === 0) {
      return;
    }

    try {
      const sessionDuration = Date.now() - sessionStartTimeRef.current;
      const recentEvents = sessionEventsRef.current.slice(-20); // Last 20 events

      // Check for immediate intervention needs
      if (enableRealTimeInterventions) {
        const currentMetrics = await calculateRealTimeMetrics(recentEvents);
        const interventionCheck = await aiCoachRef.current.shouldIntervene(
          currentMetrics as any,
          sessionDuration
        );

        if (interventionCheck.shouldIntervene && 
            Date.now() - lastInterventionRef.current > 300000) { // 5 minutes since last intervention
          setState(prev => ({
            ...prev,
            shouldIntervene: true,
            intervention: interventionCheck.intervention
          }));
          lastInterventionRef.current = Date.now();
        }
      }

      // Update real-time metrics
      const metrics = await calculateDetailedMetrics(sessionEventsRef.current);
      setState(prev => ({
        ...prev,
        realTimeMetrics: metrics
      }));

      // Generate personalized guidance
      const guidance = await generatePersonalizedGuidance();
      setState(prev => ({
        ...prev,
        personalizedGuidance: guidance
      }));

    } catch (error) {
      console.error('Real-time AI analysis failed:', error);
    }
  }, [state.isActive, enableRealTimeInterventions, userId, languageCode]);

  // Generate comprehensive learning insights
  const generateLearningInsights = useCallback(async () => {
    if (!aiCoachRef.current || !state.isActive) return [];

    try {
      const insights = await aiCoachRef.current.analyzeLearningBehavior(
        userId,
        languageCode,
        sessionEventsRef.current
      );

      setState(prev => ({ ...prev, insights }));
      return insights;
    } catch (error) {
      console.error('Failed to generate learning insights:', error);
      return [];
    }
  }, [userId, languageCode, state.isActive]);

  // Handle intervention acceptance/dismissal
  const handleIntervention = useCallback((action: 'accept' | 'dismiss' | 'defer') => {
    switch (action) {
      case 'accept':
        // User accepted the intervention
        trackLearningEvent(AnalyticsEventType.SESSION_END as any, {
          reason: 'ai_intervention_accepted',
          intervention: state.intervention
        });
        break;
      case 'dismiss':
        // User dismissed the intervention
        trackLearningEvent(AnalyticsEventType.HINT_USED as any, {
          type: 'intervention_dismissed',
          intervention: state.intervention
        });
        break;
      case 'defer':
        // User wants to defer the intervention
        lastInterventionRef.current = Date.now() + 600000; // Defer for 10 minutes
        break;
    }

    setState(prev => ({
      ...prev,
      shouldIntervene: false,
      intervention: undefined
    }));
  }, [state.intervention, trackLearningEvent]);

  // Get AI-optimized word sequence
  const getOptimalWordSequence = useCallback(async (availableWords: string[]) => {
    if (!mlModelsRef.current) return availableWords;

    try {
      const context = {
        userId,
        sessionTime: Date.now(),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      const prediction = await mlModelsRef.current.predictOptimalContentSequence(
        userId,
        availableWords,
        context
      );

      return prediction.value || availableWords;
    } catch (error) {
      console.error('Failed to get optimal word sequence:', error);
      return availableWords;
    }
  }, [userId]);

  // Get AI-recommended difficulty adjustment
  const getOptimalDifficulty = useCallback(async () => {
    if (!mlModelsRef.current) return 0.5;

    try {
      const context = {
        userId,
        sessionTime: Date.now(),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      const prediction = await mlModelsRef.current.predictPersonalizedDifficultyCurve(
        userId,
        context
      );

      return prediction.value?.curve?.[0]?.difficultyLevel || 0.5;
    } catch (error) {
      console.error('Failed to get optimal difficulty:', error);
      return 0.5;
    }
  }, [userId]);

  // Predict learning breakthrough timing
  const predictBreakthroughTiming = useCallback(async () => {
    if (!mlModelsRef.current) return null;

    try {
      const context = {
        userId,
        sessionTime: Date.now(),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      const prediction = await mlModelsRef.current.predictLearningBreakthroughTiming(
        userId,
        context
      );

      return prediction.value;
    } catch (error) {
      console.error('Failed to predict breakthrough timing:', error);
      return null;
    }
  }, [userId]);

  // Set up real-time analysis interval
  useEffect(() => {
    if (!state.isActive) return;

    const interval = setInterval(performRealTimeAnalysis, updateInterval);
    return () => clearInterval(interval);
  }, [state.isActive, performRealTimeAnalysis, updateInterval]);

  // Reset session tracking when session changes
  useEffect(() => {
    sessionEventsRef.current = [];
    sessionStartTimeRef.current = Date.now();
    lastInterventionRef.current = 0;

    setState(prev => ({
      ...prev,
      shouldIntervene: false,
      intervention: undefined
    }));
  }, [sessionId]);

  // Helper functions
  const calculateRealTimeMetrics = async (events: AnalyticsEvent[]) => {
    // Simplified real-time metrics calculation
    return {
      sessionMetrics: {
        duration: Date.now() - sessionStartTimeRef.current,
        wordsAttempted: events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length,
        accuracy: calculateAccuracy(events),
        averageResponseTime: calculateAverageResponseTime(events)
      },
      learningMetrics: {
        wordsLearned: events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length,
        masteryLevel: 0.7, // Simplified
        retentionRate: 0.8, // Simplified
        learningVelocity: 0.6 // Simplified
      },
      behavioralMetrics: {
        engagementScore: calculateEngagementScore(events),
        persistenceLevel: 0.8, // Simplified
        learningStyle: 'visual', // Simplified
        preferredDifficulty: 0.6, // Simplified
        sessionPattern: 'consistent' // Simplified
      }
    };
  };

  const calculateDetailedMetrics = async (events: AnalyticsEvent[]) => {
    const recentEvents = events.slice(-10);
    
    return {
      learningMomentum: calculateLearningMomentum(events),
      cognitiveLoad: calculateCognitiveLoad(recentEvents),
      engagementScore: calculateEngagementScore(events),
      churnRisk: await calculateChurnRisk(events)
    };
  };

  const generatePersonalizedGuidance = async () => {
    if (!aiCoachRef.current) {
      return state.personalizedGuidance;
    }

    try {
      const context = {
        userId,
        sessionTime: Date.now(),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      const personalizedPath = await aiCoachRef.current.generatePersonalizedPath(
        userId,
        languageCode,
        sessionEventsRef.current
      );

      return {
        nextWordSuggestions: personalizedPath.nextWords || [],
        difficultyAdjustment: personalizedPath.difficulty || 0,
        sessionLengthRecommendation: personalizedPath.estimatedDuration || 900000,
        learningStrategy: personalizedPath.personalizedStrategy || 'balanced'
      };
    } catch (error) {
      console.error('Failed to generate personalized guidance:', error);
      return state.personalizedGuidance;
    }
  };

  // Simple metric calculations
  const calculateAccuracy = (events: AnalyticsEvent[]) => {
    const attempts = events.filter(e => e.type === AnalyticsEventType.WORD_ATTEMPT).length;
    const successes = events.filter(e => e.type === AnalyticsEventType.WORD_SUCCESS).length;
    return attempts > 0 ? successes / attempts : 0;
  };

  const calculateAverageResponseTime = (events: AnalyticsEvent[]) => {
    const responseTimes = events.filter(e => e.data?.responseTime).map(e => e.data.responseTime);
    return responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  };

  const calculateEngagementScore = (events: AnalyticsEvent[]) => {
    // Simplified engagement calculation based on interaction frequency
    const recentEvents = events.filter(e => Date.now() - e.timestamp <= 300000); // Last 5 minutes
    return Math.min(1, recentEvents.length / 10);
  };

  const calculateLearningMomentum = (events: AnalyticsEvent[]) => {
    const now = Date.now();
    const recentSuccess = events.filter(e => 
      e.type === AnalyticsEventType.WORD_SUCCESS && now - e.timestamp <= 600000
    ).length; // Last 10 minutes
    const olderSuccess = events.filter(e => 
      e.type === AnalyticsEventType.WORD_SUCCESS && 
      now - e.timestamp > 600000 && now - e.timestamp <= 1200000
    ).length; // 10-20 minutes ago
    
    return recentSuccess - olderSuccess;
  };

  const calculateCognitiveLoad = (events: AnalyticsEvent[]) => {
    const responseTimes = events.filter(e => e.data?.responseTime).map(e => e.data.responseTime);
    if (responseTimes.length === 0) return 'optimal';
    
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    if (avgTime > 8000) return 'high';
    if (avgTime > 5000) return 'moderate';
    return 'optimal';
  };

  const calculateChurnRisk = async (events: AnalyticsEvent[]) => {
    if (!mlModelsRef.current) return 0.3;
    
    try {
      const context = {
        userId,
        sessionTime: Date.now(),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      const prediction = await mlModelsRef.current.predictChurnRisk(userId, events, context);
      return prediction.value;
    } catch (error) {
      return 0.3;
    }
  };

  return {
    // State
    ...state,
    
    // Actions
    trackLearningEvent,
    generateLearningInsights,
    handleIntervention,
    
    // AI-powered recommendations
    getOptimalWordSequence,
    getOptimalDifficulty,
    predictBreakthroughTiming,
    
    // Utilities
    isAIActive: state.isActive,
    sessionDuration: Date.now() - sessionStartTimeRef.current,
    totalEvents: sessionEventsRef.current.length
  };
};