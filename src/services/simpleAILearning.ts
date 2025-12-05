/**
 * Simple AI Learning Enhancement Service
 *
 * A minimal AI service that gradually adds intelligence to word selection
 * without complex dependencies. This is step 1 of re-enabling AI features.
 */

import { WordProgress } from '../store/types';
import { logger } from '../services/logger';

export interface SimpleAIContext {
  languageCode: string;
  sessionEvents: {
    wordId: string;
    correct: boolean;
    responseTime: number;
    timestamp: number;
  }[];
  currentPerformance: {
    accuracy: number;
    averageResponseTime: number;
    consecutiveErrors: number;
    consecutiveSuccess: number;
  };
}

export interface SimpleAIDecision {
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  difficultyAdjustment: number; // -1, 0, +1 simple adjustment
  reasoning: string[];
  confidence: number; // 0-1
}

export class SimpleAILearningService {
  /**
   * Make simple AI-driven decisions based on performance patterns
   */
  static makeAdaptiveDecision(
    context: SimpleAIContext,
    wordProgress?: WordProgress
  ): SimpleAIDecision {
    try {
      const { currentPerformance } = context;

      // Default decision
      let quizMode: SimpleAIDecision['quizMode'] = 'multiple-choice';
      let difficultyAdjustment = 0;
      const reasoning: string[] = [];
      let confidence = 0.8;

      // Simple rules-based AI logic

      // Rule 1: If user is struggling, use multiple choice
      if (currentPerformance.consecutiveErrors >= 2) {
        quizMode = 'multiple-choice';
        difficultyAdjustment = -1;
        reasoning.push('Detected struggling pattern, switching to multiple choice for support');
        confidence = 0.9;
      }

      // Rule 2: If user is excelling, increase challenge
      else if (currentPerformance.consecutiveSuccess >= 3 && currentPerformance.accuracy > 0.85) {
        quizMode = 'open-answer';
        difficultyAdjustment = 1;
        reasoning.push('High accuracy detected, increasing challenge with open answer');
        confidence = 0.85;
      }

      // Rule 3: If response time is very slow, simplify
      else if (currentPerformance.averageResponseTime > 8000) {
        // 8 seconds
        quizMode = 'multiple-choice';
        reasoning.push('Slow response time detected, providing multiple choice support');
        confidence = 0.75;
      }

      // Rule 4: Mixed performance - use varied modes
      else if (currentPerformance.accuracy > 0.6 && currentPerformance.accuracy < 0.8) {
        const modes: SimpleAIDecision['quizMode'][] = ['letter-scramble', 'fill-in-the-blank'];
        quizMode = modes[Math.floor(Math.random() * modes.length)];
        reasoning.push('Mixed performance, using varied quiz modes for engagement');
        confidence = 0.7;
      }

      // Rule 5: Word-specific adjustments
      if (wordProgress) {
        // Calculate a simple mastery score based on correct/incorrect ratio
        const totalAttempts = wordProgress.timesCorrect + wordProgress.timesIncorrect;
        const masteryLevel = totalAttempts > 0 ? wordProgress.timesCorrect / totalAttempts : 0;

        if (masteryLevel < 0.3) {
          // Low mastery - need support
          if (quizMode === 'open-answer') {
            quizMode = 'multiple-choice';
            reasoning.push('Low word mastery, switching to supportive mode');
          }
        } else if (masteryLevel > 0.8) {
          // High mastery - can challenge
          if (quizMode === 'multiple-choice') {
            quizMode = 'letter-scramble';
            reasoning.push('High word mastery, adding appropriate challenge');
          }
        }
      }

      if (reasoning.length === 0) {
        reasoning.push('Using default mode based on stable performance');
      }

      return {
        quizMode,
        difficultyAdjustment,
        reasoning,
        confidence,
      };
    } catch (error) {
      logger.error('Simple AI decision making failed, using defaults:', error);

      return {
        quizMode: 'multiple-choice',
        difficultyAdjustment: 0,
        reasoning: ['AI analysis failed, using safe default mode'],
        confidence: 0.5,
      };
    }
  }

  /**
   * Analyze current session performance for context
   */
  static analyzeSessionPerformance(
    sessionEvents: SimpleAIContext['sessionEvents']
  ): SimpleAIContext['currentPerformance'] {
    if (sessionEvents.length === 0) {
      return {
        accuracy: 0.5,
        averageResponseTime: 5000,
        consecutiveErrors: 0,
        consecutiveSuccess: 0,
      };
    }

    // Calculate accuracy
    const correctAnswers = sessionEvents.filter(event => event.correct).length;
    const accuracy = correctAnswers / sessionEvents.length;

    // Calculate average response time
    const totalResponseTime = sessionEvents.reduce((sum, event) => sum + event.responseTime, 0);
    const averageResponseTime = totalResponseTime / sessionEvents.length;

    // Calculate consecutive patterns (last 5 events)
    const recentEvents = sessionEvents.slice(-5);
    let consecutiveErrors = 0;
    let consecutiveSuccess = 0;

    // Count consecutive errors from the end
    for (let i = recentEvents.length - 1; i >= 0; i--) {
      if (!recentEvents[i].correct) {
        consecutiveErrors++;
      } else {
        break;
      }
    }

    // Count consecutive successes from the end
    if (consecutiveErrors === 0) {
      for (let i = recentEvents.length - 1; i >= 0; i--) {
        if (recentEvents[i].correct) {
          consecutiveSuccess++;
        } else {
          break;
        }
      }
    }

    return {
      accuracy,
      averageResponseTime,
      consecutiveErrors,
      consecutiveSuccess,
    };
  }
}

export const simpleAILearning = SimpleAILearningService;
