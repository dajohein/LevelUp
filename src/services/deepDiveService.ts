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
import { calculateMasteryDecay } from './masteryService';
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { userLearningProfileStorage } from './storage/userLearningProfile';
import { logger } from './logger';

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
      this.state = {
        isActive: true,
        startTime: Date.now(),
        currentPhase: 'exploration',
        explorationDepth: Math.max(1, Math.min(5, explorationDepth)),
        comprehensionStrategies: [],
        contextualConnections: [],
        analyticsBuffer: []
      };

      const sessionId = `deep-dive-${Date.now()}`;
      const estimatedDuration = targetWords * (30 + explorationDepth * 15); // Base 30s + depth factor

      const explorationPhases = [
        'Initial Discovery',
        'Contextual Exploration',
        'Comprehension Validation',
        'Knowledge Consolidation'
      ];

      logger.debug(`🕳️ Deep Dive initialized: ${targetWords} words, depth ${explorationDepth}, ~${estimatedDuration}s`);

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
    candidates: Word[],
    wordProgress: { [key: string]: WordProgress },
    currentProgress: number,
    targetWords: number,
    aiEnhancementsEnabled: boolean = true
  ): Promise<DeepDiveResult> {
    if (candidates.length === 0) {
      throw new Error('No words available for Deep Dive');
    }

    // Calculate exploration parameters
    const sessionProgress = currentProgress / targetWords;
    const comprehensionDepth = this.calculateComprehensionDepth(sessionProgress);
    const contextualComplexity = this.calculateContextualComplexity(candidates, wordProgress);

    // Basic word selection first
    let selectedWord = this.selectWordForComprehension(candidates, wordProgress, comprehensionDepth);
    let quizMode: DeepDiveResult['quizMode'] = this.getComprehensionQuizMode(selectedWord, comprehensionDepth);
    let aiEnhanced = false;
    let contextualHints: string[] = [];
    let comprehensionBoost: string[] = [];
    let reasoning: string[] = [];
    let timeAllocated: number;

    // AI-enhanced word selection for deep understanding
    if (aiEnhancementsEnabled && comprehensionDepth >= 2) {
      const aiContext: ChallengeAIContext = {
        sessionType: 'deep-dive',
        currentProgress: {
          wordsCompleted: currentProgress,
          targetWords: targetWords,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0,
          recentAccuracy: this.calculateCurrentAccuracy(wordProgress),
          sessionDuration: (Date.now() - this.state.startTime) / 1000
        },
        userState: {
          recentPerformance: []
        },
        challengeContext: {
          currentDifficulty: 50 + (comprehensionDepth * 10),
          contextualLearning: true,
          isEarlyPhase: currentProgress < 3,
          isFinalPhase: currentProgress >= targetWords - 3
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
          selectedWord = aiResult.selectedWord;
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

    // Generate contextual content
    const options = this.generateOptions(selectedWord, quizMode);
    const contextSentence = this.generateContextSentence(selectedWord, comprehensionDepth);
    const comprehensionQuestions = this.generateComprehensionQuestions(selectedWord, quizMode, comprehensionDepth);

    // Update phase based on progress
    this.updateExplorationPhase(sessionProgress, comprehensionDepth);

    logger.debug(`🕳️ Deep Dive word selected: ${selectedWord.term} (${quizMode}, AI: ${aiEnhanced}, Depth: ${comprehensionDepth}, Time: ${timeAllocated}s)`);

    // Store analytics data
    this.state.analyticsBuffer.push({
      wordId: selectedWord.id,
      comprehensionLevel: comprehensionDepth,
      explorationTime: timeAllocated,
      contextualUnderstanding: contextualComplexity,
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
    timeSpent: number,
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
   * Calculate word comprehension score for Deep Dive selection
   */
  private calculateComprehensionScore(word: Word, progress?: WordProgress): number {
    let score = 50; // Base score

    if (progress) {
      const mastery = progress.xp || 0;
      
      // Higher mastery words need deeper exploration
      score += mastery * 0.8;

      // Recent practice indicates familiarity
      if (progress.lastPracticed) {
        const daysSinceLastSeen = (Date.now() - new Date(progress.lastPracticed).getTime()) / (1000 * 60 * 60 * 24);
        
        // Prefer words that haven't been deeply explored recently
        if (daysSinceLastSeen > 7) {
          score += 20;
        } else if (daysSinceLastSeen < 1) {
          score -= 10;
        }
      }

      // Apply mastery decay for realistic comprehension assessment
      const decayedMastery = calculateMasteryDecay(progress.lastPracticed || '', progress.xp || 0);
      score += decayedMastery * 15;
    }

    // Favor words suitable for deep exploration
    if (word.term.length >= 6) {
      score += 15; // Longer words often have more to explore
    }

    // Favor words with higher complexity (if level available)
    if (word.level && word.level >= 3) {
      score += 20; // Complex words benefit from deep dive
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate comprehension depth based on session progress
   */
  private calculateComprehensionDepth(sessionProgress: number): number {
    // Increase depth as session progresses
    const baseDepth = this.state.explorationDepth;
    const progressBonus = Math.floor(sessionProgress * 2);
    
    return Math.min(5, baseDepth + progressBonus);
  }

  /**
   * Calculate contextual complexity for word selection
   */
  private calculateContextualComplexity(candidates: Word[], wordProgress: { [key: string]: WordProgress }): number {
    const avgMastery = candidates.reduce((sum, word) => {
      const progress = wordProgress[word.id];
      return sum + (progress?.xp || 0);
    }, 0) / candidates.length;

    return Math.min(100, avgMastery / 2); // 0-100 scale
  }

  /**
   * Select optimal word for comprehension exploration
   */
  private selectWordForComprehension(
    candidates: Word[],
    wordProgress: { [key: string]: WordProgress },
    comprehensionDepth: number
  ): Word {
    const scoredWords = candidates.map(word => ({
      word,
      score: this.calculateComprehensionScore(word, wordProgress[word.id])
    }));

    // Add depth-based selection preference
    scoredWords.forEach(item => {
      if (comprehensionDepth >= 4) {
        // High depth: prefer complex words
        if (item.word.level && item.word.level >= 4) {
          item.score += 25;
        }
      } else if (comprehensionDepth <= 2) {
        // Low depth: prefer approachable words
        if (item.word.level && item.word.level <= 3) {
          item.score += 15;
        }
      }
    });

    scoredWords.sort((a, b) => b.score - a.score);
    return scoredWords[0].word;
  }

  /**
   * Get comprehension-optimized quiz mode
   */
  private getComprehensionQuizMode(word: Word, comprehensionDepth: number): DeepDiveResult['quizMode'] {
    const modes: DeepDiveResult['quizMode'][] = ['multiple-choice', 'contextual-analysis', 'usage-example', 'synonym-antonym'];
    
    // Select mode based on comprehension depth
    if (comprehensionDepth >= 4) {
      return 'synonym-antonym'; // Most comprehensive
    } else if (comprehensionDepth >= 3) {
      return 'usage-example';
    } else if (comprehensionDepth >= 2) {
      return 'contextual-analysis';
    } else {
      return 'multiple-choice';
    }
  }

  /**
   * Calculate time allocation for comprehension
   */
  private calculateComprehensionTime(word: Word, quizMode: DeepDiveResult['quizMode'], comprehensionDepth: number): number {
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
    baseTime += comprehensionDepth * 10;

    // Word complexity adjustments
    if (word.term.length > 8) {
      baseTime += 10;
    }

    if (word.level && word.level >= 4) {
      baseTime += 15;
    }

    return Math.max(30, Math.min(120, baseTime));
  }

  /**
   * Calculate difficulty level
   */
  private calculateDifficultyLevel(word: Word, progress?: WordProgress): number {
    let difficulty = word.level || 3; // Default to medium
    
    if (progress) {
      const mastery = progress.xp || 0;
      
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

    if (comprehensionDepth >= 3) {
      hints.push('Explore connections to related concepts');
      hints.push('Consider how this word relates to your personal experience');
    }

    if (word.term.length > 8) {
      hints.push('Break down complex words into meaningful parts');
    }

    return hints;
  }

  /**
   * Generate comprehension boost messages
   */
  private generateComprehensionBoosts(word: Word, comprehensionDepth: number): string[] {
    const boosts: string[] = [];
    
    boosts.push('Deep learning builds lasting understanding');
    boosts.push('Take time to truly grasp this concept');
    
    if (comprehensionDepth >= 3) {
      boosts.push('You\'re building comprehensive knowledge');
      boosts.push('Deep exploration leads to mastery');
    }
    
    if (word.term.length >= 6) {
      boosts.push('Complex words offer rich learning opportunities');
    }
    
    boosts.push('Understanding deeply is more valuable than speed');
    
    return boosts;
  }

  /**
   * Generate context sentence for word exploration
   */
  private generateContextSentence(word: Word, comprehensionDepth: number): string {
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
    quizMode: DeepDiveResult['quizMode'],
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
        return this.generateContextualAnalysisOptions(word);
      
      case 'usage-example':
        return this.generateUsageExampleOptions(word);
      
      case 'synonym-antonym':
        return this.generateSynonymAntonymOptions(word);
      
      default:
        return [];
    }
  }

  /**
   * Generate multiple choice options for deep understanding
   */
  private generateMultipleChoiceOptions(word: Word): string[] {
    const correctAnswer = word.definition;
    
    // For deep dive, we want more sophisticated distractors that test true understanding
    const wrongAnswers: string[] = [];
    
    // Generate theme-based distractors based on word characteristics
    if (correctAnswer.includes('study') || correctAnswer.includes('learn')) {
      wrongAnswers.push('The process of forgetting information over time');
      wrongAnswers.push('A method of avoiding intellectual challenges');
      wrongAnswers.push('The tendency to reject new information');
    } else if (correctAnswer.includes('process') || correctAnswer.includes('method')) {
      wrongAnswers.push('A static state without change or development');
      wrongAnswers.push('An unpredictable series of random events');
      wrongAnswers.push('A fixed outcome determined in advance');
    } else if (correctAnswer.includes('feeling') || correctAnswer.includes('emotion')) {
      wrongAnswers.push('A logical reasoning pattern without sentiment');
      wrongAnswers.push('A mathematical calculation method');
      wrongAnswers.push('A systematic approach to problem-solving');
    } else {
      // Generic academic-sounding distractors
      wrongAnswers.push('A theoretical framework for analyzing concepts');
      wrongAnswers.push('A systematic approach to understanding patterns');
      wrongAnswers.push('A methodological process for evaluation');
    }
    
    // Filter to get best 3 distractors
    const selectedDistractors = wrongAnswers
      .filter(distractor => distractor !== correctAnswer)
      .filter(distractor => Math.abs(distractor.length - correctAnswer.length) < 50) // Similar length
      .slice(0, 3);
    
    // If we need more, add fallback distractors
    while (selectedDistractors.length < 3) {
      const fallbacks = [
        'An alternative interpretation of the concept',
        'A different perspective on the subject matter',
        'A contrasting viewpoint on the topic'
      ];
      
      for (const fallback of fallbacks) {
        if (!selectedDistractors.includes(fallback) && selectedDistractors.length < 3) {
          selectedDistractors.push(fallback);
        }
      }
      break;
    }

    const options = [correctAnswer, ...selectedDistractors];
    return options.sort(() => 0.5 - Math.random()); // Shuffle options
  }

  /**
   * Generate contextual analysis options
   */
  private generateContextualAnalysisOptions(word: Word): string[] {
    const correctAnswer = `Analyze how "${word.term}" functions within its semantic field`;
    
    const wrongAnswers = [
      `Memorize the dictionary definition of "${word.term}"`,
      `Translate "${word.term}" into another language`,
      `Count the syllables in "${word.term}"`
    ];
    
    const options = [correctAnswer, ...wrongAnswers];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate usage example options
   */
  private generateUsageExampleOptions(word: Word): string[] {
    const correctAnswer = `Create a meaningful sentence using "${word.term}" in context`;
    
    const wrongAnswers = [
      `Spell "${word.term}" backwards`,
      `Find words that rhyme with "${word.term}"`,
      `List all possible definitions of "${word.term}"`
    ];
    
    const options = [correctAnswer, ...wrongAnswers];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate synonym/antonym options
   */
  private generateSynonymAntonymOptions(word: Word): string[] {
    const correctAnswer = `Identify conceptual relationships and contrasts for "${word.term}"`;
    
    const wrongAnswers = [
      `Memorize the etymology of "${word.term}"`,
      `Practice pronunciation of "${word.term}"`,
      `Calculate the frequency of "${word.term}" in literature`
    ];
    
    const options = [correctAnswer, ...wrongAnswers];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Update exploration phase based on progress
   */
  private updateExplorationPhase(sessionProgress: number, comprehensionDepth: number): void {
    if (sessionProgress < 0.3) {
      this.state.currentPhase = 'exploration';
    } else if (sessionProgress < 0.7) {
      this.state.currentPhase = 'validation';
    } else {
      this.state.currentPhase = 'consolidation';
    }

    logger.debug(`🕳️ Deep Dive phase: ${this.state.currentPhase}, depth: ${comprehensionDepth}`);
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
   * Reset Deep Dive session
   */
  reset(): void {
    this.state = {
      isActive: false,
      startTime: 0,
      currentPhase: 'exploration',
      explorationDepth: 1,
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