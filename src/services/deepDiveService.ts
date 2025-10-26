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
      // Input validation to prevent NaN values
      const validTargetWords = typeof targetWords === 'number' && !isNaN(targetWords) && targetWords > 0 ? targetWords : 15;
      const validExplorationDepth = typeof explorationDepth === 'number' && !isNaN(explorationDepth) ? Math.max(1, Math.min(5, explorationDepth)) : 3;
      
      this.state = {
        isActive: true,
        startTime: Date.now(),
        currentPhase: 'exploration',
        explorationDepth: validExplorationDepth,
        comprehensionStrategies: [],
        contextualConnections: [],
        analyticsBuffer: []
      };

      const sessionId = `deep-dive-${Date.now()}`;
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
    candidates: Word[],
    wordProgress: { [key: string]: WordProgress },
    currentProgress: number,
    targetWords: number,
    aiEnhancementsEnabled: boolean = true
  ): Promise<DeepDiveResult> {
    if (candidates.length === 0) {
      throw new Error('No words available for Deep Dive');
    }

    // Input validation and sanitization
    const validCurrentProgress = typeof currentProgress === 'number' && !isNaN(currentProgress) ? Math.max(0, currentProgress) : 0;
    const validTargetWords = typeof targetWords === 'number' && !isNaN(targetWords) && targetWords > 0 ? targetWords : 15;
    
    // Calculate exploration parameters - prevent division by zero and NaN
    const sessionProgress = validCurrentProgress / validTargetWords;
    
    // Basic word selection first to determine mastery
    let selectedWord = this.selectWordForComprehension(candidates, wordProgress, 2); // Use base depth for initial selection
    
    // Now calculate depth based on both session progress AND word mastery
    const comprehensionDepth = this.calculateComprehensionDepth(sessionProgress, selectedWord, wordProgress);
    const contextualComplexity = this.calculateContextualComplexity(candidates, wordProgress);

    logger.debug(`🕳️ Deep Dive parameters: currentProgress=${validCurrentProgress}, targetWords=${validTargetWords}, sessionProgress=${sessionProgress}, comprehensionDepth=${comprehensionDepth}`);

    // Re-select word for comprehension with updated depth (might change selection)
    selectedWord = this.selectWordForComprehension(candidates, wordProgress, comprehensionDepth);
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

    // Generate contextual content - pass candidates for better option generation
    const options = this.generateOptions(selectedWord, quizMode, candidates);
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
   * Calculate comprehension depth based on session progress and word mastery
   */
  private calculateComprehensionDepth(sessionProgress: number, selectedWord?: Word, wordProgress?: { [key: string]: WordProgress }): number {
    // Input validation - handle NaN and invalid values
    const validSessionProgress = typeof sessionProgress === 'number' && !isNaN(sessionProgress) ? Math.max(0, Math.min(1, sessionProgress)) : 0;
    
    // Base depth from session progress
    const baseDepth = this.state.explorationDepth || 2; // Default depth if not set
    const progressBonus = Math.floor(validSessionProgress * 2);
    
    let sessionBasedDepth = Math.min(5, Math.max(1, baseDepth + progressBonus));
    
    // Consider individual word mastery if available
    let masteryBonus = 0;
    if (selectedWord && wordProgress && wordProgress[selectedWord.id]) {
      const wordMastery = wordProgress[selectedWord.id];
      const masteryLevel = (wordMastery.xp || 0) / 100; // Convert XP to mastery level (0-N)
      
      if (masteryLevel >= 3) {
        masteryBonus = 2; // Very high mastery → advanced modes
      } else if (masteryLevel >= 2) {
        masteryBonus = 1; // High mastery → intermediate modes
      } else if (masteryLevel >= 1) {
        masteryBonus = 0; // Some mastery → no bonus
      }
      
      logger.debug(`🕳️ Word mastery: ${selectedWord.term} has ${wordMastery.xp || 0} XP (level ${masteryLevel.toFixed(1)}) → bonus +${masteryBonus}`);
    }
    
    const result = Math.min(5, Math.max(1, sessionBasedDepth + masteryBonus));
    
    console.log(`🕳️ DEPTH CALCULATION for "${selectedWord?.term}":`, {
      sessionProgress: validSessionProgress,
      sessionBasedDepth,
      wordXP: selectedWord && wordProgress && wordProgress[selectedWord.id] ? wordProgress[selectedWord.id].xp : 'unknown',
      masteryBonus,
      finalDepth: result
    });
    
    logger.debug(`🕳️ Comprehension depth: sessionProgress=${validSessionProgress}, baseDepth=${baseDepth}, progressBonus=${progressBonus}, masteryBonus=${masteryBonus}, result=${result}`);
    
    return result;
  }

  /**
   * Calculate contextual complexity for word selection
   */
  private calculateContextualComplexity(candidates: Word[], wordProgress: { [key: string]: WordProgress }): number {
    if (candidates.length === 0) return 0; // Prevent division by zero
    
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
    // Input validation
    const validComprehensionDepth = typeof comprehensionDepth === 'number' && !isNaN(comprehensionDepth) ? Math.max(1, Math.min(5, comprehensionDepth)) : 2;
    
    const scoredWords = candidates.map(word => ({
      word,
      score: this.calculateComprehensionScore(word, wordProgress[word.id])
    }));

    // Add depth-based selection preference
    scoredWords.forEach(item => {
      if (validComprehensionDepth >= 4) {
        // High depth: prefer complex words
        if (item.word.level && item.word.level >= 4) {
          item.score += 25;
        }
      } else if (validComprehensionDepth <= 2) {
        // Low depth: prefer approachable words
        if (item.word.level && item.word.level <= 3) {
          item.score += 15;
        }
      }
    });

    scoredWords.sort((a, b) => b.score - a.score);
    
    // Select from top 20% to add variety instead of always picking the same word
    const topCandidates = scoredWords.slice(0, Math.max(1, Math.floor(scoredWords.length * 0.2)));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    return topCandidates[randomIndex].word;
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
  private generateOptions(word: Word, quizMode: DeepDiveResult['quizMode'], candidates: Word[] = []): string[] {
    switch (quizMode) {
      case 'multiple-choice':
        return this.generateMultipleChoiceOptions(word, candidates);
      case 'contextual-analysis':
      case 'usage-example':
      case 'synonym-antonym':
        // These are open-ended question modes - no options needed
        return [];
      default:
        return this.generateMultipleChoiceOptions(word, candidates);
    }
  }

  /**
   * Generate multiple choice options with enhanced candidate selection
   */
  private generateMultipleChoiceOptions(word: Word, candidates: Word[] = []): string[] {
    // Use the word's direction to determine correct answer
    const direction = word.direction || 'definition-to-term';
    const correctAnswer = direction === 'definition-to-term' ? word.term : word.definition;

    // Get incorrect options from other candidate words
    const optionCandidates = candidates.filter(w => w.id !== word.id);
    
    if (optionCandidates.length === 0) {
      // Fallback: use the existing multiple choice generation for single word
      return this.generateStandaloneMultipleChoiceOptions(word);
    }

    // Get random incorrect options from candidates
    const incorrectOptions: string[] = [];
    const shuffledCandidates = [...optionCandidates].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(3, shuffledCandidates.length); i++) {
      const candidate = shuffledCandidates[i];
      const incorrectAnswer = direction === 'definition-to-term' ? candidate.term : candidate.definition;
      if (incorrectAnswer !== correctAnswer && !incorrectOptions.includes(incorrectAnswer)) {
        incorrectOptions.push(incorrectAnswer);
      }
    }

    // If we don't have enough options, pad with fallback options
    while (incorrectOptions.length < 3) {
      const fallbackOptions = this.generateStandaloneMultipleChoiceOptions(word);
      for (const option of fallbackOptions) {
        if (option !== correctAnswer && !incorrectOptions.includes(option) && incorrectOptions.length < 3) {
          incorrectOptions.push(option);
        }
      }
      break; // Prevent infinite loop
    }

    // Create final options array with correct answer inserted at random position
    const options = [...incorrectOptions];
    const correctPos = Math.floor(Math.random() * 4);
    options.splice(correctPos, 0, correctAnswer);
    
    return options.slice(0, 4); // Ensure exactly 4 options
  }

  /**
   * Generate standalone multiple choice options for deep understanding
   */
  private generateStandaloneMultipleChoiceOptions(word: Word): string[] {
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