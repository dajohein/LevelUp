/**
 * AI-Enhanced Word Service
 *
 * Extends the enhanced word service with AI-driven adaptive learning capabilities:
 * - Real-time difficulty adjustment based on cognitive load
 * - Dynamic quiz mode switching based on performance patterns
 * - AI-powered intervention system for struggling learners
 * - Intelligent challenge escalation for high performers
 */

import { WordProgress } from '../store/types';
import { Word, getWordsForLanguage } from './wordService';
import { getWordsForModule } from './moduleService';
import {
  interleaveSessionWords,
  LearningSession,
  analyzeSessionPerformance,
  AIQuizModeOverride,
  createLearningSession,
  selectWordsForReview,
  createWordGroups,
} from './spacedRepetitionService';
import {
  adaptiveLearningEngine,
  AdaptiveLearningDecision,
  LearningEngineConfig,
} from './adaptiveLearningEngine';
import { AILearningCoach } from './ai/learningCoach';
import { PatternRecognizer } from './analytics/patternRecognizer';
import { PredictiveAnalytics } from './analytics/predictiveAnalytics';
import { enhancedStorage } from './storage/enhancedStorage';
import { AnalyticsEvent, AnalyticsEventType } from './analytics/interfaces';
import { logger } from './logger';

// Enhanced state with AI tracking
interface AIEnhancedWordServiceState {
  currentSession: LearningSession | null;
  currentLanguageCode: string | null;
  currentWordIndex: number;
  sessionWords: Array<{
    word: Word;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    type: 'group' | 'review';
    difficulty?: number;
    aiDecision?: AdaptiveLearningDecision;
  }>;
  sessionResults: Array<{
    wordId: string;
    isCorrect: boolean;
    timeSpent: number;
    quizMode: string;
    responseTime: number;
    hintsUsed: number;
  }>;
  sessionStartTime: number;
  userId: string;
  sessionId: string;
  sessionEvents: AnalyticsEvent[];
  performanceMetrics: {
    accuracy: number;
    responseTime: number;
    consecutiveErrors: number;
    consecutiveSuccess: number;
  };
  aiEngine?: typeof adaptiveLearningEngine;
  isAIEnabled: boolean;
}

export class AIEnhancedWordService {
  private state: AIEnhancedWordServiceState = {
    currentSession: null,
    currentLanguageCode: null,
    currentWordIndex: 0,
    sessionWords: [],
    sessionResults: [],
    sessionStartTime: 0,
    userId: 'default_user',
    sessionId: '',
    sessionEvents: [],
    performanceMetrics: {
      accuracy: 0,
      responseTime: 0,
      consecutiveErrors: 0,
      consecutiveSuccess: 0,
    },
    isAIEnabled: false,
  };

  constructor() {
    this.initializeAI();
  }

  /**
   * Initialize AI components
   */
  private async initializeAI(): Promise<void> {
    try {
      const patternRecognizer = new PatternRecognizer(enhancedStorage);
      const predictiveAnalytics = new PredictiveAnalytics(enhancedStorage);
      const aiCoach = new AILearningCoach(enhancedStorage, patternRecognizer, predictiveAnalytics);

      const aiConfig: Partial<LearningEngineConfig> = {
        enableAIControl: true,
        interventionThreshold: 0.6,
        difficultyAdjustmentRate: 0.2,
        adaptationSensitivity: 0.8,
      };

      // Store AI coach and config for potential future use
      logger.debug('AI components initialized:', {
        coach: !!aiCoach,
        config: aiConfig.enableAIControl,
      });

      this.state.aiEngine = adaptiveLearningEngine;
      this.state.isAIEnabled = true;

      logger.debug('✅ AI learning engine initialized');
    } catch (error) {
      logger.error('Failed to initialize AI learning engine:', error);
      this.state.isAIEnabled = false;
    }
  }

  /**
   * Initialize a new learning session with AI capabilities
   */
  async initializeLearningSession(
    languageCode: string,
    userId: string = 'default_user',
    moduleId?: string,
    wordProgress: { [key: string]: WordProgress } = {}
  ): Promise<boolean> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      logger.debug(
        `🚀 Initializing AI-enhanced learning session for ${languageCode}${moduleId ? `/${moduleId}` : ''}`
      );

      // Get words for the session
      const words = moduleId
        ? getWordsForModule(languageCode, moduleId)
        : getWordsForLanguage(languageCode);

      if (words.length === 0) {
        logger.warn(`No words available for ${languageCode}${moduleId ? `/${moduleId}` : ''}`);
        return false;
      }

      // Create base learning session
      const wordGroups = createWordGroups(words, wordProgress);
      const targetGroup = wordGroups.find(group => group.words.length > 0);

      if (!targetGroup) {
        logger.warn('No suitable word group found');
        return false;
      }

      const reviewWords = selectWordsForReview(words, wordProgress, 3);

      // Generate AI overrides if AI is enabled
      let aiOverrides: Map<string, AIQuizModeOverride> | undefined;

      if (this.state.isAIEnabled && this.state.aiEngine) {
        aiOverrides = await this.generateAIOverrides(
          [...targetGroup.words, ...reviewWords],
          wordProgress,
          languageCode,
          userId,
          sessionId
        );
      }

      // Create session with AI overrides
      const session = createLearningSession(targetGroup, reviewWords, wordProgress, aiOverrides);

      // Interleave session words for variety
      const interleavedWords = interleaveSessionWords(session);

      // Enhance words with AI decisions
      const enhancedWords = interleavedWords.map(wordData => ({
        ...wordData,
        aiDecision: undefined, // Will be populated as we progress
      }));

      this.state = {
        ...this.state,
        currentSession: session,
        currentLanguageCode: languageCode,
        userId,
        sessionId,
        currentWordIndex: 0,
        sessionWords: enhancedWords,
        sessionResults: [],
        sessionStartTime: Date.now(),
        sessionEvents: [],
        performanceMetrics: {
          accuracy: 0,
          responseTime: 0,
          consecutiveErrors: 0,
          consecutiveSuccess: 0,
        },
      };

      // Track session start
      this.trackEvent(AnalyticsEventType.SESSION_START, {
        sessionType: session.sessionType,
        totalWords: interleavedWords.length,
        groupWords: session.words.length,
        reviewWords: session.reviewWords.length,
      });

      logger.debug(`✅ AI-enhanced learning session initialized:`, {
        sessionType: session.sessionType,
        totalWords: interleavedWords.length,
        groupWords: session.words.length,
        reviewWords: session.reviewWords.length,
        aiEnabled: this.state.isAIEnabled,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize AI-enhanced learning session:', error);
      return false;
    }
  }

  /**
   * Get the current word with AI-enhanced quiz mode selection
   */
  async getCurrentWord(): Promise<{
    word: Word | null;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    options: string[];
    isReviewWord: boolean;
    progress: number;
    wordType: 'group' | 'review';
    aiDecision?: AdaptiveLearningDecision;
    shouldShowIntervention?: boolean;
    interventionMessage?: string;
  } | null> {
    if (!this.state.currentSession || !this.state.sessionWords.length) {
      return null;
    }

    const currentWordData = this.state.sessionWords[this.state.currentWordIndex];
    if (!currentWordData) {
      return null;
    }

    let { word, quizMode, type } = currentWordData;
    const progress = (this.state.currentWordIndex / this.state.sessionWords.length) * 100;

    // Apply AI decision if available and enabled
    let aiDecision: AdaptiveLearningDecision | undefined;
    let shouldShowIntervention = false;
    let interventionMessage = '';

    if (this.state.isAIEnabled && this.state.aiEngine) {
      try {
        const context = this.buildAIContext(word);
        const mastery = this.getCurrentMastery(word.id);

        // Use the full selectOptimalQuizMode method that returns AdaptiveLearningDecision
        aiDecision = await this.state.aiEngine.selectOptimalQuizMode(
          context,
          word,
          mastery,
          this.state.currentSession?.sessionType || 'practice'
        );

        // Apply AI quiz mode decision
        if (aiDecision && aiDecision.quizMode !== quizMode && aiDecision.confidence > 0.7) {
          quizMode = aiDecision.quizMode;
          logger.debug(`🤖 AI overrode quiz mode: ${quizMode}`, {
            reasoning: aiDecision.reasoning,
            confidence: aiDecision.confidence,
          });
        }

        // Check for interventions
        if (aiDecision && aiDecision.intervention) {
          shouldShowIntervention = true;
          interventionMessage = aiDecision.intervention.message;
        }

        // Update word data with AI decision
        currentWordData.aiDecision = aiDecision;
        currentWordData.quizMode = quizMode;
      } catch (error) {
        logger.error('AI decision failed, using default:', error);
      }
    }

    // Generate options for multiple choice
    let options: string[] = [];
    if (quizMode === 'multiple-choice') {
      options = this.generateMultipleChoiceOptions(word, this.getAllSessionWords());
    }

    return {
      word,
      quizMode,
      options,
      isReviewWord: type === 'review',
      progress,
      wordType: type,
      aiDecision,
      shouldShowIntervention,
      interventionMessage,
    };
  }

  /**
   * Record an answer with AI performance tracking
   */
  async recordAnswer(
    isCorrect: boolean,
    timeSpent: number = 0,
    hintsUsed: number = 0
  ): Promise<{
    correct: boolean;
    nextQuizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    aiDecision: {
      quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
      difficultyAdjustment: number;
      reasoning: string[];
      confidence: number;
    };
    isSessionComplete?: boolean;
    shouldIntervene?: boolean;
    intervention?: any;
    aiRecommendations?: any[];
  }> {
    if (!this.state.currentSession || !this.state.sessionWords.length) {
      return {
        correct: false,
        nextQuizMode: 'multiple-choice' as const,
        aiDecision: {
          quizMode: 'multiple-choice' as const,
          difficultyAdjustment: 0,
          reasoning: ['Session not active'],
          confidence: 1.0,
        },
        isSessionComplete: true,
      };
    }

    const currentWordData = this.state.sessionWords[this.state.currentWordIndex];
    const responseTime = timeSpent || Date.now() - this.state.sessionStartTime;

    if (currentWordData) {
      // Record the detailed result
      this.state.sessionResults.push({
        wordId: currentWordData.word.id,
        isCorrect,
        timeSpent,
        quizMode: currentWordData.quizMode,
        responseTime,
        hintsUsed,
      });

      // Update performance metrics
      this.updatePerformanceMetrics(isCorrect, responseTime);

      // Track analytics event
      this.trackEvent(
        isCorrect ? AnalyticsEventType.WORD_SUCCESS : AnalyticsEventType.WORD_FAILURE,
        {
          wordId: currentWordData.word.id,
          quizMode: currentWordData.quizMode,
          timeSpent,
          hintsUsed,
          difficulty: currentWordData.difficulty,
          isReviewWord: currentWordData.type === 'review',
        }
      );

      logger.debug(`📝 Recorded AI-tracked answer:`, {
        word: currentWordData.word.term,
        correct: isCorrect,
        time: timeSpent,
        mode: currentWordData.quizMode,
        aiDecision: !!currentWordData.aiDecision,
      });
    }

    // Move to next word
    this.state.currentWordIndex++;

    // Check if session is complete
    const isSessionComplete = this.state.currentWordIndex >= this.state.sessionWords.length;

    if (isSessionComplete) {
      await this.completeAISession();
      return {
        correct: isCorrect,
        nextQuizMode: 'multiple-choice' as const,
        aiDecision: {
          quizMode: 'multiple-choice' as const,
          difficultyAdjustment: 0,
          reasoning: ['Session complete'],
          confidence: 1.0,
        },
        isSessionComplete: true,
      };
    }

    // Check for AI interventions
    let shouldIntervene = false;
    let intervention;
    let aiRecommendations: any[] = [];

    if (this.state.isAIEnabled && this.state.aiEngine) {
      try {
        const context = this.buildAIContext();
        const interventionCheck = await this.state.aiEngine.shouldIntervene(context);

        if (interventionCheck.shouldIntervene) {
          shouldIntervene = true;
          intervention = interventionCheck.intervention;
        }

        // Get personalized recommendations
        aiRecommendations = await this.state.aiEngine.getPersonalizedRecommendations(context);
      } catch (error) {
        logger.error('AI intervention check failed:', error);
      }
    }

    const nextWord = await this.getCurrentWord();
    const nextQuizMode = nextWord?.quizMode || ('multiple-choice' as const);

    return {
      correct: isCorrect,
      nextQuizMode,
      aiDecision: {
        quizMode: nextQuizMode,
        difficultyAdjustment: 0,
        reasoning: aiRecommendations.map(r => r.message || r.type || 'AI recommendation'),
        confidence: 0.8,
      },
      isSessionComplete,
      shouldIntervene,
      intervention,
      aiRecommendations,
    };
  }

  /**
   * Generate AI overrides for session words
   */
  private async generateAIOverrides(
    words: Word[],
    wordProgress: { [key: string]: WordProgress },
    _languageCode: string,
    _userId: string,
    _sessionId: string
  ): Promise<Map<string, AIQuizModeOverride>> {
    const overrides = new Map<string, AIQuizModeOverride>();

    if (!this.state.aiEngine) return overrides;

    // For now, generate basic overrides based on performance patterns
    // In a full implementation, this would use historical data and ML models

    for (const word of words) {
      const progress = wordProgress[word.id];
      const mastery = progress?.xp || 0;

      // Calculate derived metrics from existing WordProgress data
      const totalAttempts = (progress?.timesCorrect || 0) + (progress?.timesIncorrect || 0);
      const calculatedAccuracy =
        totalAttempts > 0 ? (progress?.timesCorrect || 0) / totalAttempts : 0;
      const recentErrors = progress?.timesIncorrect || 0;

      // Example: Force multiple choice for words with recent failures
      if (recentErrors > 2 && calculatedAccuracy < 0.5) {
        overrides.set(word.id, {
          quizMode: 'multiple-choice',
          reasoning: ['Recent failures detected - using supportive mode'],
          confidence: 0.8,
          source: 'ai-support',
        });
      }

      // Example: Challenge high-mastery words
      else if (mastery > 80 && calculatedAccuracy > 0.9 && totalAttempts > 3) {
        overrides.set(word.id, {
          quizMode: 'open-answer',
          reasoning: ['High mastery with excellent accuracy - providing challenge'],
          confidence: 0.75,
          source: 'ai-optimization',
        });
      }
    }

    logger.debug(`🤖 Generated ${overrides.size} AI overrides for session`);
    return overrides;
  }

  /**
   * Build AI context for decision making
   */
  private buildAIContext(_currentWord?: Word): any {
    return {
      userId: this.state.userId,
      languageCode: this.state.currentLanguageCode || 'unknown',
      sessionId: this.state.sessionId,
      sessionEvents: this.state.sessionEvents,
      currentPerformance: this.state.performanceMetrics,
    };
  }

  /**
   * Update performance metrics for AI analysis
   */
  private updatePerformanceMetrics(isCorrect: boolean, responseTime: number): void {
    const results = this.state.sessionResults;
    const recentResults = results.slice(-10); // Last 10 answers

    // Update accuracy
    this.state.performanceMetrics.accuracy =
      recentResults.length > 0
        ? recentResults.filter(r => r.isCorrect).length / recentResults.length
        : 0;

    // Update average response time
    this.state.performanceMetrics.responseTime =
      recentResults.length > 0
        ? recentResults.reduce((sum, r) => sum + r.responseTime, 0) / recentResults.length
        : responseTime;

    // Update streak counters
    if (isCorrect) {
      this.state.performanceMetrics.consecutiveSuccess++;
      this.state.performanceMetrics.consecutiveErrors = 0;
    } else {
      this.state.performanceMetrics.consecutiveErrors++;
      this.state.performanceMetrics.consecutiveSuccess = 0;
    }
  }

  /**
   * Track analytics events
   */
  private trackEvent(eventType: AnalyticsEventType, data: any): void {
    const event: AnalyticsEvent = {
      id: `${Date.now()}_${Math.random()}`,
      type: eventType,
      timestamp: Date.now(),
      userId: this.state.userId,
      sessionId: this.state.sessionId,
      data: {
        languageCode: this.state.currentLanguageCode,
        ...data,
      },
    };

    this.state.sessionEvents.push(event);
  }

  /**
   * Get current mastery for a word
   */
  private getCurrentMastery(wordId: string): number {
    // Calculate mastery based on existing data in session results
    const wordResults = this.state.sessionResults.filter(r => r.wordId === wordId);

    if (wordResults.length === 0) {
      return 0.5; // Default moderate mastery for new words
    }

    const correctCount = wordResults.filter(r => r.isCorrect).length;
    const accuracy = correctCount / wordResults.length;
    const avgResponseTime =
      wordResults.reduce((sum, r) => sum + r.responseTime, 0) / wordResults.length;

    // Combine accuracy and speed for mastery score (0-1)
    let mastery = accuracy * 0.7; // 70% weight on accuracy

    // Bonus for quick responses (under 3 seconds)
    if (avgResponseTime < 3000) {
      mastery += 0.2;
    } else if (avgResponseTime > 8000) {
      mastery -= 0.1; // Penalty for very slow responses
    }

    return Math.max(0, Math.min(1, mastery));
    return 50;
  }

  /**
   * Generate multiple choice options
   */
  private generateMultipleChoiceOptions(targetWord: Word, allWords: Word[]): string[] {
    const direction = targetWord.direction || 'definition-to-term';
    const correctAnswer =
      direction === 'definition-to-term' ? targetWord.term : targetWord.definition;

    // Filter out the correct answer and get random incorrect options
    const incorrectOptions = allWords
      .filter(w => w.id !== targetWord.id)
      .map(w => (direction === 'definition-to-term' ? w.term : w.definition))
      .filter(option => option !== correctAnswer);

    // Shuffle and take 3 incorrect options
    const shuffledIncorrect = incorrectOptions.sort(() => Math.random() - 0.5).slice(0, 3);

    // Create options array with correct answer in random position
    const options = [...shuffledIncorrect];
    const correctPosition = Math.floor(Math.random() * 4);
    options.splice(correctPosition, 0, correctAnswer);

    return options;
  }

  /**
   * Get all words from current session
   */
  private getAllSessionWords(): Word[] {
    return this.state.sessionWords.map(item => item.word);
  }

  /**
   * Complete AI-enhanced session with analysis
   */
  private async completeAISession(): Promise<void> {
    if (!this.state.currentSession) return;

    try {
      // Track session completion
      this.trackEvent(AnalyticsEventType.SESSION_END, {
        sessionDuration: Date.now() - this.state.sessionStartTime,
        totalWords: this.state.sessionWords.length,
        accuracy: this.state.performanceMetrics.accuracy,
        averageResponseTime: this.state.performanceMetrics.responseTime,
      });

      // Analyze session performance
      const analysis = analyzeSessionPerformance(
        this.state.currentSession,
        this.state.sessionResults
      );

      // Generate AI insights if available
      if (this.state.isAIEnabled && this.state.aiEngine) {
        const context = this.buildAIContext();
        const recommendations = await this.state.aiEngine.getPersonalizedRecommendations(context);

        logger.debug('🤖 AI session analysis completed', {
          recommendations: recommendations.length,
          accuracy: this.state.performanceMetrics.accuracy,
          aiInterventions: this.state.sessionWords.filter(w => w.aiDecision).length,
        });
      }

      logger.debug('✅ AI-enhanced session completed:', {
        accuracy: analysis.averageAccuracy,
        wordsLearned: analysis.wordsLearned,
        fastestMode: analysis.fastestModeCompletion,
        aiDecisions: this.state.sessionWords.filter(w => w.aiDecision).length,
      });
    } catch (error) {
      logger.error('Failed to complete AI session analysis:', error);
    }
  }

  /**
   * Check if AI learning is enabled
   */
  isAIEnabled(): boolean {
    return this.state.isAIEnabled;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      currentIndex: this.state.currentWordIndex,
      totalWords: this.state.sessionWords.length,
      accuracy: this.state.performanceMetrics.accuracy,
      isComplete: this.state.currentWordIndex >= this.state.sessionWords.length,
      aiDecisions: this.state.sessionWords.filter(w => w.aiDecision).length,
      sessionDuration: Date.now() - this.state.sessionStartTime,
    };
  }

  /**
   * Enable or disable AI features
   */
  setAIEnabled(enabled: boolean): void {
    this.state.isAIEnabled = enabled;
    if (enabled && !this.state.aiEngine) {
      this.initializeAI();
    }
  }
}

// Export singleton instance
export const aiEnhancedWordService = new AIEnhancedWordService();
