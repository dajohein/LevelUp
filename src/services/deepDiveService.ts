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
import { calculateMasteryDecay } from './masteryService';

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
    analyticsBuffer: []
  };

  /**
   * Initialize Deep Dive session
   */
  async initializeDeepDive(
    languageCode: string,
    targetWords: number = 15,
    explorationDepth: number = 3
  ): Promise<{
    success: boolean;
    sessionId: string;
    estimatedDuration: number;
    explorationPhases: string[];
  }> {
    try {
      // Input validation to prevent NaN values
      const validTargetWords = typeof targetWords === 'number' && !isNaN(targetWords) && targetWords > 0 ? targetWords : 15;
      const validExplorationDepth = typeof explorationDepth === 'number' && !isNaN(explorationDepth) ? Math.max(1, Math.min(5, explorationDepth)) : 3;
      
      const sessionId = `deep-dive-${Date.now()}`;

      this.state = {
        isActive: true,
        startTime: Date.now(),
        currentPhase: 'exploration',
        explorationDepth: validExplorationDepth,
        languageCode,
        sessionId,
        comprehensionStrategies: [],
        contextualConnections: [],
        analyticsBuffer: []
      };
      const estimatedDuration = validTargetWords * (30 + validExplorationDepth * 15); // Base 30s + depth factor

      const explorationPhases = [
        'Initial Discovery',
        'Contextual Exploration',
        'Comprehension Validation',
        'Knowledge Consolidation'
      ];

      logger.debug(`🕳️ Deep Dive initialized: ${validTargetWords} words, depth ${validExplorationDepth}, ~${estimatedDuration}s`);

      return {
        success: true,
        sessionId,
        estimatedDuration,
        explorationPhases
      };
    } catch (error) {
      logger.error('❌ Failed to initialize Deep Dive:', error);
      return {
        success: false,
        sessionId: '',
        estimatedDuration: 0,
        explorationPhases: []
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
    const validCurrentProgress = typeof currentProgress === 'number' && !isNaN(currentProgress) ? Math.max(0, currentProgress) : 0;
    const validTargetWords = typeof targetWords === 'number' && !isNaN(targetWords) && targetWords > 0 ? targetWords : 15;
    
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

    logger.debug(`🕳️ Deep Dive parameters: currentProgress=${validCurrentProgress}, targetWords=${validTargetWords}, sessionProgress=${sessionProgress}, comprehensionDepth=${comprehensionDepth}, difficulty=${difficulty}`);

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty
    );

    if (!selectionResult) {
      throw new Error('No words available for Deep Dive');
    }

    const selectedWord = selectionResult.word;
    let quizMode: DeepDiveResult['quizMode'] = this.getComprehensionQuizMode(selectedWord, comprehensionDepth);
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
          sessionDuration: (Date.now() - this.state.startTime) / 1000
        },
        userState: {
          recentPerformance: recentPerformance
        },
        challengeContext: {
          currentDifficulty: 50 + (comprehensionDepth * 10),
          contextualLearning: true,
          isEarlyPhase: validCurrentProgress < 3,
          isFinalPhase: validCurrentProgress >= validTargetWords - 3
        }
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
          if (aiResult.aiRecommendedMode && ['multiple-choice', 'contextual-analysis', 'usage-example', 'synonym-antonym'].includes(aiResult.aiRecommendedMode as any)) {
            quizMode = aiResult.aiRecommendedMode as DeepDiveResult['quizMode'];
          }
          aiEnhanced = true;
          contextualHints = this.generateContextualHints(selectedWord, quizMode, comprehensionDepth);
          comprehensionBoost = this.generateComprehensionBoosts(selectedWord, comprehensionDepth);
          reasoning = aiResult.reasoning || [];
          
          // Record deep learning pattern
          this.state.comprehensionStrategies.push(`comprehension-depth-${comprehensionDepth}`);
        } else {
          // Fallback to standard deep dive logic
          contextualHints = this.generateContextualHints(selectedWord, quizMode, comprehensionDepth);
          comprehensionBoost = this.generateComprehensionBoosts(selectedWord, comprehensionDepth);
        }
      } catch (error) {
        logger.warn('⚠️ AI enhancement failed for Deep Dive, using fallback:', error);
        contextualHints = this.generateContextualHints(selectedWord, quizMode, comprehensionDepth);
        comprehensionBoost = this.generateComprehensionBoosts(selectedWord, comprehensionDepth);
      }
    } else {
      // Standard deep dive logic without AI
      contextualHints = this.generateContextualHints(selectedWord, quizMode, comprehensionDepth);
      comprehensionBoost = this.generateComprehensionBoosts(selectedWord, comprehensionDepth);
    }

    // Calculate time allocation based on comprehension depth
    timeAllocated = this.calculateComprehensionTime(selectedWord, quizMode, comprehensionDepth);
    const difficultyLevel = this.calculateDifficultyLevel(selectedWord, wordProgress[selectedWord.id]);

    // Generate contextual content with simple fallback options
    const options = this.generateOptions(selectedWord, quizMode);
    const contextSentence = this.generateContextSentence(selectedWord);
    const comprehensionQuestions = this.generateComprehensionQuestions(selectedWord, comprehensionDepth);

    // Update phase based on progress
    this.updateExplorationPhase(sessionProgress, comprehensionDepth);

    logger.debug(`🕳️ Deep Dive word selected: ${selectedWord.term} (${quizMode}, AI: ${aiEnhanced}, Depth: ${comprehensionDepth}, Time: ${timeAllocated}s)`);

    // Store analytics data
    this.state.analyticsBuffer.push({
      wordId: selectedWord.id,
      comprehensionLevel: comprehensionDepth,
      explorationTime: timeAllocated,
      contextualUnderstanding: comprehensionDepth * 20, // Simple contextual complexity based on depth
      timestamp: Date.now()
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
      reasoning
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
      await userLearningProfileStorage.updateDeepDiveData(userId || 'default_user', {
        completed: isCorrect,
        wordsLearned: isCorrect ? 1 : 0,
        retentionRate: comprehensionLevel / 5.0,
        contextualLearningScore: explorationScore,
        repetitionCount: 1,
        contextVariations: 1,
        wasAIEnhanced: wasAIEnhanced,
        firstAttemptAccuracy: isCorrect ? 1.0 : 0.0,
        improvementAfterContext: 0,
        contextualHintUsage: 0
      });

      // Track contextual connections
      this.updateContextualConnections(wordId, comprehensionLevel);

      logger.debug(`🕳️ Deep Dive completion recorded: ${wordId}, correct: ${isCorrect}, depth: ${comprehensionLevel}`);
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
      timestamp: Date.now()
    });

    // Limit buffer size to prevent memory bloat
    if (this.state.analyticsBuffer.length > 50) {
      this.state.analyticsBuffer = this.state.analyticsBuffer.slice(-30);
    }

    // Update contextual connections
    this.updateContextualConnections(wordId, this.state.explorationDepth);

    logger.debug(`🕳️ Word completion recorded: ${wordId}, correct: ${isCorrect}, time: ${responseTime}ms`);
  }

  /**
   * Calculate comprehension depth based on session progress
   */
  private calculateComprehensionDepth(sessionProgress: number): number {
    // Input validation - handle NaN and invalid values
    const validSessionProgress = typeof sessionProgress === 'number' && !isNaN(sessionProgress) ? Math.max(0, Math.min(1, sessionProgress)) : 0;
    
    // Base depth from session progress
    const baseDepth = this.state.explorationDepth || 2; // Default depth if not set
    const progressBonus = Math.floor(validSessionProgress * 2);
    
    const result = Math.min(5, Math.max(1, baseDepth + progressBonus));
    
    logger.debug(`🕳️ Comprehension depth: sessionProgress=${validSessionProgress}, baseDepth=${baseDepth}, progressBonus=${progressBonus}, result=${result}`);
    
    return result;
  }

  /**
   * Get comprehension-optimized quiz mode
   */
  private getComprehensionQuizMode(word: Word, comprehensionDepth: number): DeepDiveResult['quizMode'] {
    // Input validation
    const validComprehensionDepth = typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth) ? Math.max(1, Math.min(5, comprehensionDepth)) : 2;
    
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
    
    logger.debug(`🎯 Quiz mode selection: depth=${validComprehensionDepth} → mode=${selectedMode} for word="${word.term}"`);
    
    console.log(`🎯 QUIZ MODE SELECTION for "${word.term}":`, {
      comprehensionDepth: validComprehensionDepth,
      selectedMode,
      explanation: validComprehensionDepth <= 2 ? 'Basic recognition' :
                   validComprehensionDepth <= 3 ? 'Context understanding' :
                   validComprehensionDepth <= 4 ? 'Application knowledge' : 'Advanced relationships'
    });
    
    return selectedMode;
  }

  /**
   * Calculate time allocation for comprehension
   */
  private calculateComprehensionTime(word: Word, quizMode: DeepDiveResult['quizMode'], comprehensionDepth: number): number {
    // Input validation - handle NaN comprehensionDepth
    const validComprehensionDepth = typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth) ? Math.max(1, Math.min(5, comprehensionDepth)) : 2;
    
    let baseTime = 45; // Base time for deep dive

    // Mode-specific time adjustments
    switch (quizMode) {
      case 'synonym-antonym':
        baseTime += 20;
        break;
      case 'usage-example':
        baseTime += 15;
        break;
      case 'contextual-analysis':
        baseTime += 10;
        break;
      case 'multiple-choice':
        baseTime += 5;
        break;
    }

    // Depth-based time scaling
    baseTime += validComprehensionDepth * 10;

    // Word complexity adjustments
    if (word.term && word.term.length > 8) {
      baseTime += 10;
    }

    if (word.level && word.level >= 4) {
      baseTime += 15;
    }

    const result = Math.max(30, Math.min(120, baseTime));
    
    logger.debug(`🕳️ Comprehension time: word=${word.term}, quizMode=${quizMode}, depth=${validComprehensionDepth}, baseTime=${baseTime}, result=${result}`);
    
    return result;
  }

  /**
   * Calculate difficulty level
   */
  private calculateDifficultyLevel(word: Word, progress?: WordProgress): number {
    let difficulty = word.level || 3; // Default to medium
    
    if (progress) {
      const mastery = calculateMasteryDecay(progress.lastPracticed, progress.xp || 0);
      
      // Adjust based on mastery
      if (mastery > 80) {
        difficulty = Math.max(1, difficulty - 1);
      } else if (mastery < 30) {
        difficulty = Math.min(5, difficulty + 1);
      }
    }

    return difficulty;
  }

  /**
   * Generate contextual hints for deep exploration
   */
  private generateContextualHints(word: Word, quizMode: DeepDiveResult['quizMode'], comprehensionDepth: number): string[] {
    // Input validation
    const validComprehensionDepth = typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth) ? Math.max(1, Math.min(5, comprehensionDepth)) : 2;
    
    const hints: string[] = [];
    
    switch (quizMode) {
      case 'contextual-analysis':
        hints.push('Consider how this word is used in different situations');
        hints.push('Think about the emotional or cultural context');
        break;
      case 'usage-example':
        hints.push('Create a mental image of how you would use this word');
        hints.push('Consider both formal and informal usage');
        break;
      case 'synonym-antonym':
        hints.push('Think about words with similar and opposite meanings');
        hints.push('Consider subtle differences between similar words');
        break;
      default:
        hints.push('Take time to fully understand all aspects of this word');
    }

    if (validComprehensionDepth >= 3) {
      hints.push('Explore connections to related concepts');
      hints.push('Consider how this word relates to your personal experience');
    }

    if (word.term && word.term.length > 8) {
      hints.push('Break down complex words into meaningful parts');
    }

    return hints;
  }

  /**
   * Generate comprehension boost messages
   */
  private generateComprehensionBoosts(word: Word, comprehensionDepth: number): string[] {
    // Input validation
    const validComprehensionDepth = typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth) ? Math.max(1, Math.min(5, comprehensionDepth)) : 2;
    
    const boosts: string[] = [];
    
    boosts.push('Deep learning builds lasting understanding');
    boosts.push('Take time to truly grasp this concept');
    
    if (validComprehensionDepth >= 3) {
      boosts.push('You\'re building comprehensive knowledge');
      boosts.push('Deep exploration leads to mastery');
    }
    
    if (word.term && word.term.length >= 6) {
      boosts.push('Complex words offer rich learning opportunities');
    }
    
    boosts.push('Understanding deeply is more valuable than speed');
    
    return boosts;
  }

  /**
   * Generate context sentence for word exploration
   */
  private generateContextSentence(word: Word /* comprehensionDepth: number */): string { // Removed unused parameter
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
      type: 'definition'
    });

    if (comprehensionDepth >= 2) {
      questions.push({
        question: `How would you use "${word.term}" in a sentence?`,
        expectedAnswer: `A sentence using "${word.term}" with proper context and meaning.`,
        type: 'usage'
      });
    }

    if (comprehensionDepth >= 3) {
      questions.push({
        question: `What situations would you use "${word.term}" in?`,
        expectedAnswer: `Appropriate contexts and scenarios where "${word.term}" would be used effectively.`,
        type: 'context'
      });
    }

    if (comprehensionDepth >= 4) {
      questions.push({
        question: `What words are related to "${word.term}"?`,
        expectedAnswer: `Synonyms, antonyms, and related concepts connected to "${word.term}".`,
        type: 'relationship'
      });
    }

    return questions;
  }

  /**
   * Generate comprehensive quiz options for deep learning
   */
  private generateOptions(word: Word, quizMode: DeepDiveResult['quizMode']): string[] {
    switch (quizMode) {
      case 'multiple-choice':
        return this.generateMultipleChoiceOptions(word);
      case 'contextual-analysis':
      case 'usage-example':
      case 'synonym-antonym':
        // These are open-ended question modes - no options needed
        return [];
      default:
        return this.generateMultipleChoiceOptions(word);
    }
  }

  /**
   * Generate multiple choice options with simple fallbacks
   */
  private generateMultipleChoiceOptions(word: Word): string[] {
    // Use the word's direction to determine correct answer
    const direction = word.direction || 'definition-to-term';
    const correctAnswer = direction === 'definition-to-term' ? word.term : word.definition;

    // Generate simple fallback wrong answers for deep dive
    const fallbackWrongAnswers = [
      'Erste falsche Antwort', // First wrong answer
      'Zweite falsche Antwort', // Second wrong answer
      'Dritte falsche Antwort'  // Third wrong answer
    ];
    
    const incorrectOptions = fallbackWrongAnswers
      .filter(answer => answer !== correctAnswer)
      .slice(0, 3);

    // Create final options array with correct answer inserted at random position
    const options = [...incorrectOptions];
    const correctPos = Math.floor(Math.random() * 4);
    options.splice(correctPos, 0, correctAnswer);
    
    return options.slice(0, 4); // Ensure exactly 4 options
  }

  /**
   * Update exploration phase based on progress
   */
  private updateExplorationPhase(sessionProgress: number, comprehensionDepth: number): void {
    // Input validation
    const validSessionProgress = typeof sessionProgress === 'number' && !isNaN(sessionProgress) ? Math.max(0, Math.min(1, sessionProgress)) : 0;
    const validComprehensionDepth = typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth) ? Math.max(1, Math.min(5, comprehensionDepth)) : 2;
    
    if (validSessionProgress < 0.3) {
      this.state.currentPhase = 'exploration';
    } else if (validSessionProgress < 0.7) {
      this.state.currentPhase = 'validation';
    } else {
      this.state.currentPhase = 'consolidation';
    }

    logger.debug(`🕳️ Deep Dive phase: ${this.state.currentPhase}, progress: ${validSessionProgress}, depth: ${validComprehensionDepth}`);
  }

  /**
   * Update contextual connections
   */
  private updateContextualConnections(wordId: string, comprehensionLevel: number): void {
    // Add or update contextual connection
    const existingConnection = this.state.contextualConnections.find(conn => conn.word === wordId);
    
    if (existingConnection) {
      existingConnection.strength = Math.min(100, existingConnection.strength + comprehensionLevel * 10);
    } else {
      this.state.contextualConnections.push({
        word: wordId,
        relationship: 'comprehensive-understanding',
        strength: comprehensionLevel * 10
      });
    }
  }

  /**
   * Calculate current accuracy from word progress
   */
  private calculateCurrentAccuracy(wordProgress: { [key: string]: WordProgress }): number {
    const progressEntries = Object.values(wordProgress);
    if (progressEntries.length === 0) return 1.0;

    const totalAttempts = progressEntries.reduce((sum, p) => sum + (p.timesCorrect || 0) + (p.timesIncorrect || 0), 0);
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
      .filter(p => p.lastPracticed && (Date.now() - new Date(p.lastPracticed).getTime()) < 300000) // Last 5 minutes
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
      .filter(p => p.lastPracticed && (Date.now() - new Date(p.lastPracticed).getTime()) < 300000) // Last 5 minutes
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
        score: entry.comprehensionLevel * 20 // Simple scoring
      });
    });

    // Add recent word progress data
    const recentEntries = Object.values(wordProgress)
      .filter(p => p.lastPracticed && (Date.now() - new Date(p.lastPracticed).getTime()) < 600000) // Last 10 minutes
      .sort((a, b) => new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime())
      .slice(0, 10); // Last 10 words

    recentEntries.forEach(entry => {
      performanceData.push({
        timestamp: new Date(entry.lastPracticed).getTime(),
        correct: (entry.timesCorrect || 0) > (entry.timesIncorrect || 0),
        responseTime: 3000, // Default response time
        score: entry.xp || 0
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
      analyticsBuffer: []
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