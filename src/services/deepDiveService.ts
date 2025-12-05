/**
 * Deep Dive Challenge Service
 *
 * AI-enhanced comprehensive learning mode focusing on thorough understanding,
 * contextual analysis, and multi-faceted word knowledge exploration.
 *
 * Features:
 * - Contextual learning with real-world examples
 * - Multi-modal quiz progression
 * - AI-powered comprehension validation
 * - Deep understanding reinforcement
 */

import { challengeAIIntegrator, ChallengeAIContext } from './challengeAIIntegrator';
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { userLearningProfileStorage } from './storage/userLearningProfile';
import { logger } from './logger';
import { selectWordForChallenge } from './wordSelectionManager';
import { calculateWordDifficulty, calculateTimeAllocation } from './challengeServiceUtils';
import { DeepDiveSessionData } from '../types/challengeTypes';
import { generateHints, generateSupport } from './challengeServiceUtils';

export interface DeepDiveResult {
  word: Word;
  quizMode: 'multiple-choice' | 'contextual-analysis' | 'usage-example' | 'synonym-antonym';
  options?: string[];
  contextSentence?: string;
  comprehensionQuestions?: Array<{
    question: string;
    expectedAnswer: string;
    type: 'definition' | 'context' | 'usage' | 'relationship';
  }>;
  timeAllocated: number;
  difficultyLevel: number;
  aiEnhanced: boolean;
  contextualHints: string[];
  comprehensionBoost: string[];
  reasoning: string[];
}

interface DeepDiveState {
  isActive: boolean;
  startTime: number;
  currentPhase: 'exploration' | 'validation' | 'consolidation';
  explorationDepth: number; // 1-5 scale
  languageCode: string;
  moduleId?: string; // Module for scoped challenges
  sessionId: string;
  comprehensionStrategies: string[];
  contextualConnections: Array<{
    word: string;
    relationship: string;
    strength: number;
  }>;
  analyticsBuffer: Array<{
    wordId: string;
    comprehensionLevel: number;
    explorationTime: number;
    contextualUnderstanding: number;
    timestamp: number;
  }>;
}

export class DeepDiveService {
  private state: DeepDiveState = {
    isActive: false,
    startTime: 0,
    currentPhase: 'exploration',
    explorationDepth: 1,
    languageCode: '',
    sessionId: '',
    comprehensionStrategies: [],
    contextualConnections: [],
    analyticsBuffer: [],
  };

  /**
   * Initialize Deep Dive session
   */
  async initializeDeepDive(
    languageCode: string,
    targetWords: number = 15,
    explorationDepth: number = 3,
    moduleId?: string // Module for scoped challenges
  ): Promise<{
    success: boolean;
    sessionId: string;
    estimatedDuration: number;
    explorationPhases: string[];
  }> {
    try {
      // Input validation to prevent NaN values
      const validTargetWords =
        typeof targetWords === 'number' && !isNaN(targetWords) && targetWords > 0
          ? targetWords
          : 15;
      const validExplorationDepth =
        typeof explorationDepth === 'number' && !isNaN(explorationDepth)
          ? Math.max(1, Math.min(5, explorationDepth))
          : 3;

      const sessionId = `deep-dive-${Date.now()}`;

      this.state = {
        isActive: true,
        startTime: Date.now(),
        currentPhase: 'exploration',
        explorationDepth: validExplorationDepth,
        languageCode,
        moduleId, // Store module for word selection
        sessionId,
        comprehensionStrategies: [],
        contextualConnections: [],
        analyticsBuffer: [],
      };
      const estimatedDuration = validTargetWords * (30 + validExplorationDepth * 15); // Base 30s + depth factor

      const explorationPhases = [
        'Initial Discovery',
        'Contextual Exploration',
        'Comprehension Validation',
        'Knowledge Consolidation',
      ];

      logger.debug(
        `🕳️ Deep Dive initialized: ${validTargetWords} words, depth ${validExplorationDepth}, ~${estimatedDuration}s`
      );

      return {
        success: true,
        sessionId,
        estimatedDuration,
        explorationPhases,
      };
    } catch (error) {
      logger.error('❌ Failed to initialize Deep Dive:', error);
      return {
        success: false,
        sessionId: '',
        estimatedDuration: 0,
        explorationPhases: [],
      };
    }
  }

  /**
   * Get next Deep Dive word with AI enhancement
   */
  async getNextDeepDiveWord(
    wordProgress: { [key: string]: WordProgress },
    currentProgress: number,
    targetWords: number,
    aiEnhancementsEnabled: boolean = true
  ): Promise<DeepDiveResult> {
    if (!this.state.isActive) {
      throw new Error('Deep Dive session not initialized');
    }

    // Input validation and sanitization
    const validCurrentProgress =
      typeof currentProgress === 'number' && !isNaN(currentProgress)
        ? Math.max(0, currentProgress)
        : 0;
    const validTargetWords =
      typeof targetWords === 'number' && !isNaN(targetWords) && targetWords > 0 ? targetWords : 15;

    // Calculate exploration parameters - prevent division by zero and NaN
    const sessionProgress = validCurrentProgress / validTargetWords;
    const comprehensionDepth = this.calculateComprehensionDepth(sessionProgress);

    // Determine difficulty based on comprehension depth and session progress
    let difficulty: 'easy' | 'medium' | 'hard';

    if (comprehensionDepth >= 4 || sessionProgress > 0.6) {
      difficulty = 'hard'; // Deep exploration or advanced session
    } else if (comprehensionDepth >= 3 || sessionProgress > 0.3) {
      difficulty = 'medium'; // Moderate exploration
    } else {
      difficulty = 'easy'; // Initial exploration phase
    }

    logger.debug(
      `🕳️ Deep Dive parameters: currentProgress=${validCurrentProgress}, targetWords=${validTargetWords}, sessionProgress=${sessionProgress}, comprehensionDepth=${comprehensionDepth}, difficulty=${difficulty}`
    );

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty,
      this.state.moduleId // Pass module for scoped selection
    );

    if (!selectionResult) {
      throw new Error('No words available for Deep Dive');
    }

    const selectedWord = selectionResult.word;
    let quizMode: DeepDiveResult['quizMode'] = this.getComprehensionQuizMode(
      selectedWord,
      comprehensionDepth
    );
    let aiEnhanced = false;
    let contextualHints: string[] = [];
    let comprehensionBoost: string[] = [];
    let reasoning: string[] = [];
    let timeAllocated: number;

    // AI-enhanced word selection for deep understanding
    if (aiEnhancementsEnabled && comprehensionDepth >= 2) {
      // Build recent performance data from analytics buffer and current session
      const recentPerformance = this.buildRecentPerformanceData(
        validCurrentProgress,
        sessionProgress,
        wordProgress
      );

      const aiContext: ChallengeAIContext = {
        sessionType: 'deep-dive',
        currentProgress: {
          wordsCompleted: validCurrentProgress,
          targetWords: validTargetWords,
          consecutiveCorrect: this.calculateConsecutiveCorrect(wordProgress),
          consecutiveIncorrect: this.calculateConsecutiveIncorrect(wordProgress),
          recentAccuracy: this.calculateCurrentAccuracy(wordProgress),
          sessionDuration: (Date.now() - this.state.startTime) / 1000,
        },
        userState: {
          recentPerformance: recentPerformance,
        },
        challengeContext: {
          currentDifficulty: 50 + comprehensionDepth * 10,
          contextualLearning: true,
          isEarlyPhase: validCurrentProgress < 3,
          isFinalPhase: validCurrentProgress >= validTargetWords - 3,
        },
      };

      try {
        const aiResult = await challengeAIIntegrator.enhanceWordSelection(
          selectedWord,
          quizMode,
          aiContext,
          wordProgress
        );

        if (aiResult.interventionNeeded) {
          // AI can suggest a different mode, but we use the centrally selected word
          if (
            aiResult.aiRecommendedMode &&
            ['multiple-choice', 'contextual-analysis', 'usage-example', 'synonym-antonym'].includes(
              aiResult.aiRecommendedMode as any
            )
          ) {
            quizMode = aiResult.aiRecommendedMode as DeepDiveResult['quizMode'];
          }
          aiEnhanced = true;
          contextualHints = generateHints({
            word: selectedWord,
            quizMode,
            context: 'normal',
          });
          comprehensionBoost = generateSupport({
            context: 'normal',
            challengePhase:
              validCurrentProgress < 3
                ? 'early'
                : validCurrentProgress >= validTargetWords - 3
                  ? 'late'
                  : 'middle',
          });
          reasoning = aiResult.reasoning || [];

          // Record deep learning pattern
          this.state.comprehensionStrategies.push(`comprehension-depth-${comprehensionDepth}`);
        } else {
          // Fallback to standard deep dive logic
          contextualHints = generateHints({
            word: selectedWord,
            quizMode,
            context: 'normal',
          });
          comprehensionBoost = generateSupport({
            context: 'normal',
            challengePhase:
              validCurrentProgress < 3
                ? 'early'
                : validCurrentProgress >= validTargetWords - 3
                  ? 'late'
                  : 'middle',
          });
        }
      } catch (error) {
        logger.warn('⚠️ AI enhancement failed for Deep Dive, using fallback:', error);
        contextualHints = generateHints({
          word: selectedWord,
          quizMode,
          context: 'normal',
        });
        comprehensionBoost = generateSupport({
          context: 'normal',
          challengePhase:
            validCurrentProgress < 3
              ? 'early'
              : validCurrentProgress >= validTargetWords - 3
                ? 'late'
                : 'middle',
        });
      }
    } else {
      // Standard deep dive logic without AI
      contextualHints = generateHints({
        word: selectedWord,
        quizMode,
        context: 'normal',
      });
      comprehensionBoost = generateSupport({
        context: 'normal',
        challengePhase:
          validCurrentProgress < 3
            ? 'early'
            : validCurrentProgress >= validTargetWords - 3
              ? 'late'
              : 'middle',
      });
    }

    // Calculate difficulty and time allocation
    const difficultyLevel = calculateWordDifficulty(selectedWord, wordProgress[selectedWord.id]);
    timeAllocated = calculateTimeAllocation(selectedWord, 'deep-dive', difficultyLevel, quizMode);

    // Generate contextual content with simple fallback options
    const options = this.generateOptions(selectedWord, quizMode);
    const contextSentence = this.generateContextSentence(selectedWord);
    const comprehensionQuestions = this.generateComprehensionQuestions(
      selectedWord,
      comprehensionDepth
    );

    // Update phase based on progress
    this.updateExplorationPhase(sessionProgress, comprehensionDepth);

    logger.debug(
      `🕳️ Deep Dive word selected: ${selectedWord.term} (${quizMode}, AI: ${aiEnhanced}, Depth: ${comprehensionDepth}, Time: ${timeAllocated}s)`
    );

    // Store analytics data
    this.state.analyticsBuffer.push({
      wordId: selectedWord.id,
      comprehensionLevel: comprehensionDepth,
      explorationTime: timeAllocated,
      contextualUnderstanding: comprehensionDepth * 20, // Simple contextual complexity based on depth
      timestamp: Date.now(),
    });

    return {
      word: selectedWord,
      quizMode,
      options,
      contextSentence,
      comprehensionQuestions,
      timeAllocated,
      difficultyLevel,
      aiEnhanced,
      contextualHints,
      comprehensionBoost,
      reasoning,
    };
  }

  /**
   * Record Deep Dive completion and analytics
   */
  async recordDeepDiveCompletion(
    userId: string,
    wordId: string,
    isCorrect: boolean,
    // timeSpent: number, // Removed unused parameter
    comprehensionLevel: number,
    explorationScore: number,
    wasAIEnhanced: boolean = false
  ): Promise<void> {
    try {
      const sessionData: DeepDiveSessionData = {
        completed: isCorrect,
        wordsLearned: isCorrect ? 1 : 0,
        retentionRate: comprehensionLevel / 5.0,
        contextualLearningScore: explorationScore,
        repetitionCount: 1,
        contextVariations: 1,
        wasAIEnhanced: wasAIEnhanced,
        firstAttemptAccuracy: isCorrect ? 1.0 : 0.0,
        improvementAfterContext: 0,
        contextualHintUsage: 0,
      };

      await userLearningProfileStorage.updateDeepDiveData(userId || 'default_user', sessionData);

      // Track contextual connections
      this.updateContextualConnections(wordId, comprehensionLevel);

      logger.debug(
        `🕳️ Deep Dive completion recorded: ${wordId}, correct: ${isCorrect}, depth: ${comprehensionLevel}`
      );
    } catch (error) {
      logger.error('❌ Failed to record Deep Dive completion:', error);
    }
  }

  /**
   * Record word completion and update internal tracking
   */
  recordWordCompletion(wordId: string, isCorrect: boolean, responseTime: number): void {
    // Add to analytics buffer for AI analysis
    this.state.analyticsBuffer.push({
      wordId,
      comprehensionLevel: this.state.explorationDepth,
      explorationTime: responseTime / 1000, // Convert to seconds
      contextualUnderstanding: this.state.explorationDepth * 20,
      timestamp: Date.now(),
    });

    // Limit buffer size to prevent memory bloat
    if (this.state.analyticsBuffer.length > 50) {
      this.state.analyticsBuffer = this.state.analyticsBuffer.slice(-30);
    }

    // Update contextual connections
    this.updateContextualConnections(wordId, this.state.explorationDepth);

    logger.debug(
      `🕳️ Word completion recorded: ${wordId}, correct: ${isCorrect}, time: ${responseTime}ms`
    );
  }

  /**
   * Calculate comprehension depth based on session progress
   */
  private calculateComprehensionDepth(sessionProgress: number): number {
    // Input validation - handle NaN and invalid values
    const validSessionProgress =
      typeof sessionProgress === 'number' && !isNaN(sessionProgress)
        ? Math.max(0, Math.min(1, sessionProgress))
        : 0;

    // Base depth from session progress
    const baseDepth = this.state.explorationDepth || 2; // Default depth if not set
    const progressBonus = Math.floor(validSessionProgress * 2);

    const result = Math.min(5, Math.max(1, baseDepth + progressBonus));

    logger.debug(
      `🕳️ Comprehension depth: sessionProgress=${validSessionProgress}, baseDepth=${baseDepth}, progressBonus=${progressBonus}, result=${result}`
    );

    return result;
  }

  /**
   * Get comprehension-optimized quiz mode
   */
  private getComprehensionQuizMode(
    word: Word,
    comprehensionDepth: number
  ): DeepDiveResult['quizMode'] {
    // Input validation
    const validComprehensionDepth =
      typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth)
        ? Math.max(1, Math.min(5, comprehensionDepth))
        : 2;

    let selectedMode: DeepDiveResult['quizMode'];

    // Progressive quiz mode selection based on comprehension depth
    if (validComprehensionDepth <= 2) {
      selectedMode = 'multiple-choice'; // Basic recognition
    } else if (validComprehensionDepth <= 3) {
      selectedMode = 'contextual-analysis'; // Context understanding
    } else if (validComprehensionDepth <= 4) {
      selectedMode = 'usage-example'; // Application knowledge
    } else {
      selectedMode = 'synonym-antonym'; // Advanced relationships
    }

    logger.debug(
      `🎯 Quiz mode selection: depth=${validComprehensionDepth} → mode=${selectedMode} for word="${word.term}"`
    );

    console.log(`🎯 QUIZ MODE SELECTION for "${word.term}":`, {
      comprehensionDepth: validComprehensionDepth,
      selectedMode,
      explanation:
        validComprehensionDepth <= 2
          ? 'Basic recognition'
          : validComprehensionDepth <= 3
            ? 'Context understanding'
            : validComprehensionDepth <= 4
              ? 'Application knowledge'
              : 'Advanced relationships',
    });

    return selectedMode;
  }

  /**
   * Update exploration phase based on progress
   */

  /**
   * Generate context sentence for word exploration
   */
  private generateContextSentence(word: Word /* comprehensionDepth: number */): string {
    // Removed unused parameter
    // This would ideally use real context data or AI-generated sentences
    // For now, using the word's definition context
    if (word.context && word.context.sentence) {
      return word.context.sentence;
    }

    // Generate a simple context sentence
    return `Understanding "${word.term}" in context: ${word.definition}`;
  }

  /**
   * Generate comprehension questions
   */
  private generateComprehensionQuestions(
    word: Word,
    // quizMode: DeepDiveResult['quizMode'], // Removed unused parameter
    comprehensionDepth: number
  ): Array<{
    question: string;
    expectedAnswer: string;
    type: 'definition' | 'context' | 'usage' | 'relationship';
  }> {
    const questions: Array<{
      question: string;
      expectedAnswer: string;
      type: 'definition' | 'context' | 'usage' | 'relationship';
    }> = [];

    // Always include a definition question
    questions.push({
      question: `What does "${word.term}" mean?`,
      expectedAnswer: word.definition,
      type: 'definition',
    });

    if (comprehensionDepth >= 2) {
      questions.push({
        question: `How would you use "${word.term}" in a sentence?`,
        expectedAnswer: `A sentence using "${word.term}" with proper context and meaning.`,
        type: 'usage',
      });
    }

    if (comprehensionDepth >= 3) {
      questions.push({
        question: `What situations would you use "${word.term}" in?`,
        expectedAnswer: `Appropriate contexts and scenarios where "${word.term}" would be used effectively.`,
        type: 'context',
      });
    }

    if (comprehensionDepth >= 4) {
      questions.push({
        question: `What words are related to "${word.term}"?`,
        expectedAnswer: `Synonyms, antonyms, and related concepts connected to "${word.term}".`,
        type: 'relationship',
      });
    }

    return questions;
  }

  /**
   * Generate comprehensive quiz options for deep learning
   * Note: Options are now generated by the adapter for proper module scoping
   */
  private generateOptions(_word: Word, quizMode: DeepDiveResult['quizMode']): string[] {
    switch (quizMode) {
      case 'multiple-choice':
        // Return empty - adapter will generate module-scoped options
        return [];
      case 'contextual-analysis':
      case 'usage-example':
      case 'synonym-antonym':
        // These are open-ended question modes - no options needed
        return [];
      default:
        // Return empty - adapter will handle option generation
        return [];
    }
  }

  /**
   * Update exploration phase based on progress
   */
  private updateExplorationPhase(sessionProgress: number, comprehensionDepth: number): void {
    // Input validation
    const validSessionProgress =
      typeof sessionProgress === 'number' && !isNaN(sessionProgress)
        ? Math.max(0, Math.min(1, sessionProgress))
        : 0;
    const validComprehensionDepth =
      typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth)
        ? Math.max(1, Math.min(5, comprehensionDepth))
        : 2;

    if (validSessionProgress < 0.3) {
      this.state.currentPhase = 'exploration';
    } else if (validSessionProgress < 0.7) {
      this.state.currentPhase = 'validation';
    } else {
      this.state.currentPhase = 'consolidation';
    }

    logger.debug(
      `🕳️ Deep Dive phase: ${this.state.currentPhase}, progress: ${validSessionProgress}, depth: ${validComprehensionDepth}`
    );
  }

  /**
   * Update contextual connections
   */
  private updateContextualConnections(wordId: string, comprehensionLevel: number): void {
    // Add or update contextual connection
    const existingConnection = this.state.contextualConnections.find(conn => conn.word === wordId);

    if (existingConnection) {
      existingConnection.strength = Math.min(
        100,
        existingConnection.strength + comprehensionLevel * 10
      );
    } else {
      this.state.contextualConnections.push({
        word: wordId,
        relationship: 'comprehensive-understanding',
        strength: comprehensionLevel * 10,
      });
    }
  }

  /**
   * Calculate current accuracy from word progress
   */
  private calculateCurrentAccuracy(wordProgress: { [key: string]: WordProgress }): number {
    const progressEntries = Object.values(wordProgress);
    if (progressEntries.length === 0) return 1.0;

    const totalAttempts = progressEntries.reduce(
      (sum, p) => sum + (p.timesCorrect || 0) + (p.timesIncorrect || 0),
      0
    );
    const totalCorrect = progressEntries.reduce((sum, p) => sum + (p.timesCorrect || 0), 0);

    return totalAttempts > 0 ? totalCorrect / totalAttempts : 1.0;
  }

  /**
   * Calculate consecutive correct answers from recent word progress
   */
  private calculateConsecutiveCorrect(wordProgress: { [key: string]: WordProgress }): number {
    // Simple implementation - count recent consecutive correct answers
    // This could be enhanced with analytics buffer tracking
    const recentEntries = Object.values(wordProgress)
      .filter(p => p.lastPracticed && Date.now() - new Date(p.lastPracticed).getTime() < 300000) // Last 5 minutes
      .sort((a, b) => new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime());

    let consecutive = 0;
    for (const entry of recentEntries) {
      if (entry.timesCorrect && entry.timesCorrect > (entry.timesIncorrect || 0)) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  /**
   * Calculate consecutive incorrect answers from recent word progress
   */
  private calculateConsecutiveIncorrect(wordProgress: { [key: string]: WordProgress }): number {
    // Simple implementation - count recent consecutive incorrect answers
    const recentEntries = Object.values(wordProgress)
      .filter(p => p.lastPracticed && Date.now() - new Date(p.lastPracticed).getTime() < 300000) // Last 5 minutes
      .sort((a, b) => new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime());

    let consecutive = 0;
    for (const entry of recentEntries) {
      if (entry.timesIncorrect && entry.timesIncorrect > (entry.timesCorrect || 0)) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  /**
   * Build recent performance data for AI analysis
   */
  private buildRecentPerformanceData(
    _currentProgress: number,
    _sessionProgress: number,
    wordProgress: { [key: string]: WordProgress }
  ): any[] {
    // Build performance data from analytics buffer and word progress
    const performanceData: any[] = [];

    // Add analytics buffer data
    this.state.analyticsBuffer.forEach(entry => {
      performanceData.push({
        timestamp: entry.timestamp,
        correct: true, // Assume correct for now - could be enhanced
        responseTime: entry.explorationTime * 1000, // Convert to ms
        comprehensionLevel: entry.comprehensionLevel,
        score: entry.comprehensionLevel * 20, // Simple scoring
      });
    });

    // Add recent word progress data
    const recentEntries = Object.values(wordProgress)
      .filter(p => p.lastPracticed && Date.now() - new Date(p.lastPracticed).getTime() < 600000) // Last 10 minutes
      .sort((a, b) => new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime())
      .slice(0, 10); // Last 10 words

    recentEntries.forEach(entry => {
      performanceData.push({
        timestamp: new Date(entry.lastPracticed).getTime(),
        correct: (entry.timesCorrect || 0) > (entry.timesIncorrect || 0),
        responseTime: 3000, // Default response time
        score: entry.xp || 0,
      });
    });

    // Sort by timestamp (most recent first)
    return performanceData.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }

  /**
   * Reset Deep Dive session
   */
  reset(): void {
    this.state = {
      isActive: false,
      startTime: 0,
      currentPhase: 'exploration',
      explorationDepth: 1,
      languageCode: '',
      sessionId: '',
      comprehensionStrategies: [],
      contextualConnections: [],
      analyticsBuffer: [],
    };
    logger.debug('🕳️ Deep Dive service reset');
  }

  /**
   * Get current state for debugging
   */
  getState(): DeepDiveState {
    return { ...this.state };
  }
}

export const deepDiveService = new DeepDiveService();
