/**
 * Fill in the Blank Challenge Service
 * 
 * AI-enhanced sentence completion challenge focusing on contextual understanding,
 * natural language comprehension, and word usage in realistic scenarios.
 * 
 * Features:
 * - Contextual sentence completion
 * - AI-powered difficulty adaptation
 * - Natural language understanding validation
 * - Sentence complexity analysis
 */

import { challengeAIIntegrator, ChallengeAIContext } from './challengeAIIntegrator';
import { calculateMasteryDecay } from './masteryService';
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { userLearningProfileStorage } from './storage/userLearningProfile';
import { logger } from './logger';

export interface FillInTheBlankResult {
  word: Word;
  sentence: string;
  blankPosition: number;
  options?: string[];
  sentenceComplexity: 'simple' | 'moderate' | 'complex';
  contextualClues: string[];
  timeAllocated: number;
  difficultyLevel: number;
  aiEnhanced: boolean;
  languageHints: string[];
  contextualSupport: string[];
  reasoning: string[];
}

interface FillInTheBlankState {
  isActive: boolean;
  startTime: number;
  currentComplexity: 'simple' | 'moderate' | 'complex';
  sentencePatterns: Array<{
    pattern: string;
    complexity: 'simple' | 'moderate' | 'complex';
    usage: number;
  }>;
  contextualStrategies: string[];
  languagePatterns: Array<{
    wordId: string;
    sentenceType: string;
    comprehensionScore: number;
    naturalness: number;
    timestamp: number;
  }>;
  analyticsBuffer: Array<{
    wordId: string;
    sentenceComplexity: 'simple' | 'moderate' | 'complex';
    completionTime: number;
    contextualAccuracy: number;
    naturalLanguageScore: number;
    timestamp: number;
  }>;
}

export class FillInTheBlankService {
  private state: FillInTheBlankState = {
    isActive: false,
    startTime: 0,
    currentComplexity: 'simple',
    sentencePatterns: [],
    contextualStrategies: [],
    languagePatterns: [],
    analyticsBuffer: []
  };

  /**
   * Initialize Fill in the Blank session
   */
  async initializeFillInTheBlank(
    languageCode: string,
    targetWords: number = 20,
    initialComplexity: 'simple' | 'moderate' | 'complex' = 'simple'
  ): Promise<{
    success: boolean;
    sessionId: string;
    estimatedDuration: number;
    complexityLevels: string[];
  }> {
    try {
      this.state = {
        isActive: true,
        startTime: Date.now(),
        currentComplexity: initialComplexity,
        sentencePatterns: this.initializeSentencePatterns(),
        contextualStrategies: [],
        languagePatterns: [],
        analyticsBuffer: []
      };

      const sessionId = `fill-blank-${Date.now()}`;
      const complexityMultiplier = this.getComplexityMultiplier(initialComplexity);
      const estimatedDuration = targetWords * (25 * complexityMultiplier);

      const complexityLevels = ['Simple sentences', 'Moderate complexity', 'Complex structures'];

      logger.debug(`📝 Fill in the Blank initialized: ${targetWords} words, complexity ${initialComplexity}, ~${estimatedDuration}s`);

      return {
        success: true,
        sessionId,
        estimatedDuration,
        complexityLevels
      };
    } catch (error) {
      logger.error('❌ Failed to initialize Fill in the Blank:', error);
      return {
        success: false,
        sessionId: '',
        estimatedDuration: 0,
        complexityLevels: []
      };
    }
  }

  /**
   * Get next Fill in the Blank challenge with AI enhancement
   */
  async getNextFillInTheBlankWord(
    candidates: Word[],
    wordProgress: { [key: string]: WordProgress },
    currentProgress: number,
    targetWords: number,
    aiEnhancementsEnabled: boolean = true
  ): Promise<FillInTheBlankResult> {
    if (candidates.length === 0) {
      throw new Error('No words available for Fill in the Blank');
    }

    // Calculate contextual parameters
    const sessionProgress = currentProgress / targetWords;
    const sentenceComplexity = this.calculateSentenceComplexity(sessionProgress);
    const contextualDifficulty = this.calculateContextualDifficulty(candidates, wordProgress);

    // Basic word selection first
    let selectedWord = this.selectWordForContext(candidates, wordProgress, sentenceComplexity);
    let aiEnhanced = false;
    let languageHints: string[] = [];
    let contextualSupport: string[] = [];
    let reasoning: string[] = [];
    let timeAllocated: number;

    // AI-enhanced word selection for contextual understanding
    if (aiEnhancementsEnabled && contextualDifficulty > 30) {
      const aiContext: ChallengeAIContext = {
        sessionType: 'fill-in-the-blank',
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
          currentDifficulty: contextualDifficulty,
          contextualLearning: true,
          sentenceComplexity: sentenceComplexity,
          isEarlyPhase: currentProgress < 3,
          isFinalPhase: currentProgress >= targetWords - 3
        }
      };

      try {
        const aiResult = await challengeAIIntegrator.enhanceWordSelection(
          selectedWord,
          'fill-in-the-blank',
          aiContext,
          wordProgress
        );

        if (aiResult.interventionNeeded) {
          selectedWord = aiResult.selectedWord;
          aiEnhanced = true;
          languageHints = this.generateLanguageHints(selectedWord, sentenceComplexity);
          contextualSupport = this.generateContextualSupport(selectedWord, sentenceComplexity);
          reasoning = aiResult.reasoning || [];
          
          // Record contextual adaptation strategy
          this.state.contextualStrategies.push(`complexity-${sentenceComplexity}`);
        } else {
          // Fallback to standard contextual logic
          languageHints = this.generateLanguageHints(selectedWord, sentenceComplexity);
          contextualSupport = this.generateContextualSupport(selectedWord, sentenceComplexity);
        }
      } catch (error) {
        logger.warn('⚠️ AI enhancement failed for Fill in the Blank, using fallback:', error);
        languageHints = this.generateLanguageHints(selectedWord, sentenceComplexity);
        contextualSupport = this.generateContextualSupport(selectedWord, sentenceComplexity);
      }
    } else {
      // Standard fill-in-the-blank logic without AI
      languageHints = this.generateLanguageHints(selectedWord, sentenceComplexity);
      contextualSupport = this.generateContextualSupport(selectedWord, sentenceComplexity);
    }

    // Generate sentence and calculate parameters
    const sentence = this.generateSentence(selectedWord, sentenceComplexity);
    const blankPosition = this.calculateBlankPosition(sentence, selectedWord.term);
    const options = this.generateOptions(selectedWord, sentenceComplexity);
    const contextualClues = this.extractContextualClues(sentence, selectedWord.term);
    
    timeAllocated = this.calculateCompletionTime(selectedWord, sentenceComplexity);
    const difficultyLevel = this.calculateDifficultyLevel(selectedWord, wordProgress[selectedWord.id]);

    // Update complexity based on progress
    this.updateSentenceComplexity(sessionProgress, contextualDifficulty);

    logger.debug(`📝 Fill in the Blank word selected: ${selectedWord.term} (${sentenceComplexity}, AI: ${aiEnhanced}, Time: ${timeAllocated}s)`);

    // Store analytics data
    this.state.analyticsBuffer.push({
      wordId: selectedWord.id,
      sentenceComplexity: sentenceComplexity,
      completionTime: timeAllocated,
      contextualAccuracy: contextualDifficulty,
      naturalLanguageScore: this.calculateNaturalnessScore(sentence),
      timestamp: Date.now()
    });

    return {
      word: selectedWord,
      sentence,
      blankPosition,
      options,
      sentenceComplexity,
      contextualClues,
      timeAllocated,
      difficultyLevel,
      aiEnhanced,
      languageHints,
      contextualSupport,
      reasoning
    };
  }

  /**
   * Record Fill in the Blank completion and analytics
   */
  async recordFillInTheBlankCompletion(
    userId: string,
    wordId: string,
    isCorrect: boolean,
    timeSpent: number,
    sentenceComplexity: 'simple' | 'moderate' | 'complex',
    contextualAccuracy: number,
    wasAIEnhanced: boolean = false,
    contextUtilization: number = 0.8,
    contextualClueUsage: number = 0.5
  ): Promise<void> {
    try {
      await userLearningProfileStorage.updateFillInTheBlankData(userId || 'default_user', {
        completed: isCorrect,
        contextualAccuracy: contextualAccuracy,
        contextUtilization: contextUtilization,
        sentenceComplexity: sentenceComplexity,
        wasAIEnhanced: wasAIEnhanced,
        contextualClueUsage: contextualClueUsage,
        grammarRecognition: isCorrect ? 1.0 : 0.0,
        semanticAccuracy: contextualAccuracy,
        syntacticAccuracy: isCorrect ? 1.0 : 0.0,
        pragmaticAccuracy: contextualAccuracy
      });

      // Track language pattern understanding
      this.updateLanguagePatterns(wordId, sentenceComplexity, contextualAccuracy);

      logger.debug(`📝 Fill in the Blank completion recorded: ${wordId}, correct: ${isCorrect}, complexity: ${sentenceComplexity}`);
    } catch (error) {
      logger.error('❌ Failed to record Fill in the Blank completion:', error);
    }
  }

  /**
   * Calculate contextual word score for Fill in the Blank selection
   */
  private calculateContextualScore(word: Word, progress?: WordProgress): number {
    let score = 50; // Base score

    if (progress) {
      const mastery = progress.xp || 0;
      
      // Moderate mastery is ideal for contextual challenges
      if (mastery >= 30 && mastery <= 70) {
        score += 20;
      } else if (mastery < 30) {
        score += 10; // Still valuable for learning
      } else {
        score += 5; // High mastery words for consolidation
      }

      // Recent practice indicates familiarity
      if (progress.lastPracticed) {
        const daysSinceLastSeen = (Date.now() - new Date(progress.lastPracticed).getTime()) / (1000 * 60 * 60 * 24);
        
        // Prefer words that could benefit from contextual reinforcement
        if (daysSinceLastSeen > 3 && daysSinceLastSeen < 14) {
          score += 15;
        }
      }

      // Apply mastery decay for realistic assessment
      const decayedMastery = calculateMasteryDecay(progress.lastPracticed || '', progress.xp || 0);
      score += decayedMastery * 12;
    }

    // Favor words suitable for sentence contexts
    if (word.term.length >= 4 && word.term.length <= 10) {
      score += 15; // Good length for sentence integration
    }

    // Favor words that can be used in various contexts
    if (word.level && word.level >= 2 && word.level <= 4) {
      score += 10; // Intermediate words work well in sentences
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate sentence complexity based on session progress
   */
  private calculateSentenceComplexity(sessionProgress: number): 'simple' | 'moderate' | 'complex' {
    if (sessionProgress < 0.3) {
      return 'simple';
    } else if (sessionProgress < 0.7) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * Calculate contextual difficulty for word selection
   */
  private calculateContextualDifficulty(candidates: Word[], wordProgress: { [key: string]: WordProgress }): number {
    const avgMastery = candidates.reduce((sum, word) => {
      const progress = wordProgress[word.id];
      return sum + (progress?.xp || 0);
    }, 0) / candidates.length;

    const avgLevel = candidates.reduce((sum, word) => sum + (word.level || 3), 0) / candidates.length;

    return Math.min(100, (avgMastery * 0.6) + (avgLevel * 8));
  }

  /**
   * Select optimal word for contextual usage
   */
  private selectWordForContext(
    candidates: Word[],
    wordProgress: { [key: string]: WordProgress },
    sentenceComplexity: 'simple' | 'moderate' | 'complex'
  ): Word {
    const scoredWords = candidates.map(word => ({
      word,
      score: this.calculateContextualScore(word, wordProgress[word.id])
    }));

    // Add complexity-based selection preference
    scoredWords.forEach(item => {
      if (sentenceComplexity === 'complex') {
        // Complex sentences: prefer sophisticated words
        if (item.word.level && item.word.level >= 4) {
          item.score += 20;
        }
        if (item.word.term.length >= 7) {
          item.score += 10;
        }
      } else if (sentenceComplexity === 'simple') {
        // Simple sentences: prefer accessible words
        if (item.word.level && item.word.level <= 3) {
          item.score += 15;
        }
        if (item.word.term.length <= 7) {
          item.score += 10;
        }
      }
    });

    scoredWords.sort((a, b) => b.score - a.score);
    return scoredWords[0].word;
  }

  /**
   * Generate sentence with blank for word
   */
  private generateSentence(word: Word, complexity: 'simple' | 'moderate' | 'complex'): string {
    // Use word context if available
    if (word.context && word.context.sentence) {
      const contextSentence = word.context.sentence;
      if (contextSentence.includes(word.term)) {
        return contextSentence.replace(word.term, '______');
      }
    }

    // Generate sentence based on complexity
    const templates = this.getSentenceTemplates(complexity);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace('[WORD]', '______').replace('[DEFINITION]', word.definition);
  }

  /**
   * Get sentence templates for different complexity levels
   */
  private getSentenceTemplates(complexity: 'simple' | 'moderate' | 'complex'): string[] {
    switch (complexity) {
      case 'simple':
        return [
          'The [WORD] is very important.',
          'I learned about [WORD] today.',
          'This [WORD] helps us understand.',
          'The concept of [WORD] means [DEFINITION].'
        ];
      case 'moderate':
        return [
          'Understanding [WORD] requires careful consideration of [DEFINITION].',
          'The significance of [WORD] becomes clear when we examine [DEFINITION].',
          'In many contexts, [WORD] refers to [DEFINITION].',
          'Students often struggle with [WORD] until they grasp that it means [DEFINITION].'
        ];
      case 'complex':
        return [
          'The multifaceted nature of [WORD] encompasses not only [DEFINITION], but also broader implications.',
          'While [WORD] traditionally denotes [DEFINITION], contemporary usage has evolved significantly.',
          'The epistemological framework surrounding [WORD] suggests that [DEFINITION] represents merely one facet.',
          'Scholars debate whether [WORD], defined as [DEFINITION], adequately captures the phenomenon.'
        ];
      default:
        return ['The [WORD] is important.'];
    }
  }

  /**
   * Calculate blank position in sentence
   */
  private calculateBlankPosition(sentence: string, wordTerm: string): number {
    const blankIndex = sentence.indexOf('______');
    return blankIndex !== -1 ? blankIndex : 0;
  }

  /**
   * Generate contextually appropriate word options for fill-in-the-blank
   */
  private generateOptions(word: Word, complexity: 'simple' | 'moderate' | 'complex'): string[] {
    // Generate 4 options including the correct answer
    const options = [word.term];
    
    // We need to generate word distractors that could plausibly fit in the sentence
    // but are incorrect. This is more sophisticated than definition distractors.
    
    const correctWordLength = word.term.length;
    const correctWordLevel = word.level || 3;
    
    // Generate distractors based on word characteristics and complexity
    const potentialDistractors: string[] = [];
    
    switch (complexity) {
      case 'simple':
        // Simple words that might fit grammatically but are semantically wrong
        if (correctWordLength <= 6) {
          potentialDistractors.push('thing', 'place', 'time', 'way', 'part', 'work', 'life', 'world');
        } else {
          potentialDistractors.push('example', 'problem', 'question', 'answer', 'moment', 'person');
        }
        break;
        
      case 'moderate':
        // More sophisticated vocabulary appropriate for moderate complexity
        if (correctWordLevel <= 2) {
          potentialDistractors.push('concept', 'approach', 'method', 'process', 'system', 'structure');
        } else {
          potentialDistractors.push('framework', 'perspective', 'analysis', 'evaluation', 'assessment', 'interpretation');
        }
        break;
        
      case 'complex':
        // Advanced academic vocabulary for complex sentences
        potentialDistractors.push(
          'paradigm', 'methodology', 'epistemology', 'phenomenon', 'manifestation',
          'conceptualization', 'interpretation', 'implementation', 'consideration', 'implication'
        );
        break;
    }
    
    // Filter distractors to be similar length and different from correct answer
    const suitableDistractors = potentialDistractors
      .filter(distractor => distractor !== word.term.toLowerCase())
      .filter(distractor => Math.abs(distractor.length - correctWordLength) <= 3)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    // If we need more distractors, add some generic ones based on word type
    while (suitableDistractors.length < 3) {
      const wordTypeDistractors = this.generateWordTypeDistractors(word, complexity);
      for (const distractor of wordTypeDistractors) {
        if (!suitableDistractors.includes(distractor) && 
            !options.includes(distractor) && 
            suitableDistractors.length < 3) {
          suitableDistractors.push(distractor);
        }
      }
      break; // Prevent infinite loop
    }
    
    options.push(...suitableDistractors);
    return options.sort(() => Math.random() - 0.5);
  }
  
  /**
   * Generate distractors based on word type/part of speech
   */
  private generateWordTypeDistractors(word: Word, complexity: 'simple' | 'moderate' | 'complex'): string[] {
    // This is a simplified approach - ideally we'd have POS tagging
    const term = word.term.toLowerCase();
    const definition = word.definition.toLowerCase();
    
    // Heuristic detection of word type based on definition patterns
    if (definition.includes('to ') || definition.includes('ing ') || definition.includes('the act of')) {
      // Likely a verb or gerund
      return complexity === 'simple' ? ['doing', 'making', 'taking'] : 
             complexity === 'moderate' ? ['creating', 'developing', 'establishing'] :
             ['implementing', 'formulating', 'conceptualizing'];
    } else if (definition.includes('person who') || definition.includes('one who')) {
      // Likely a noun (person)
      return complexity === 'simple' ? ['person', 'worker', 'helper'] :
             complexity === 'moderate' ? ['individual', 'specialist', 'expert'] :
             ['practitioner', 'professional', 'theorist'];
    } else if (definition.includes('state of') || definition.includes('quality of')) {
      // Likely an abstract noun
      return complexity === 'simple' ? ['feeling', 'state', 'thing'] :
             complexity === 'moderate' ? ['condition', 'situation', 'quality'] :
             ['phenomenon', 'characteristic', 'attribute'];
    } else {
      // Default noun distractors
      return complexity === 'simple' ? ['object', 'item', 'element'] :
             complexity === 'moderate' ? ['component', 'factor', 'aspect'] :
             ['constituent', 'parameter', 'variable'];
    }
  }

  /**
   * Extract contextual clues from sentence
   */
  private extractContextualClues(sentence: string, wordTerm: string): string[] {
    const clues: string[] = [];
    
    // Look for defining words/phrases
    if (sentence.includes('means') || sentence.includes('refers to')) {
      clues.push('Look for definition clues in the sentence');
    }
    
    if (sentence.includes('important') || sentence.includes('significant')) {
      clues.push('The sentence indicates importance or significance');
    }
    
    if (sentence.includes('understanding') || sentence.includes('concept')) {
      clues.push('Focus on conceptual understanding');
    }
    
    // Add general contextual guidance
    clues.push('Read the entire sentence for context');
    clues.push('Consider what word would make the most sense');
    
    return clues;
  }

  /**
   * Calculate completion time allocation
   */
  private calculateCompletionTime(word: Word, complexity: 'simple' | 'moderate' | 'complex'): number {
    let baseTime = 30; // Base time for fill-in-the-blank

    // Complexity adjustments
    const complexityMultiplier = this.getComplexityMultiplier(complexity);
    baseTime *= complexityMultiplier;

    // Word complexity adjustments
    if (word.term.length > 8) {
      baseTime += 10;
    }

    if (word.level && word.level >= 4) {
      baseTime += 10;
    }

    return Math.max(20, Math.min(90, baseTime));
  }

  /**
   * Get complexity multiplier
   */
  private getComplexityMultiplier(complexity: 'simple' | 'moderate' | 'complex'): number {
    switch (complexity) {
      case 'simple': return 1.0;
      case 'moderate': return 1.3;
      case 'complex': return 1.6;
      default: return 1.0;
    }
  }

  /**
   * Calculate difficulty level
   */
  private calculateDifficultyLevel(word: Word, progress?: WordProgress): number {
    let difficulty = word.level || 3; // Default to medium
    
    if (progress) {
      const mastery = progress.xp || 0;
      
      // Adjust based on mastery
      if (mastery > 70) {
        difficulty = Math.max(1, difficulty - 1);
      } else if (mastery < 40) {
        difficulty = Math.min(5, difficulty + 1);
      }
    }

    return difficulty;
  }

  /**
   * Calculate naturalness score for generated sentence
   */
  private calculateNaturalnessScore(sentence: string): number {
    // Simple heuristics for sentence naturalness
    let score = 50;
    
    // Prefer reasonable sentence length
    if (sentence.length > 20 && sentence.length < 150) {
      score += 20;
    }
    
    // Check for natural language patterns
    if (sentence.includes(' the ') || sentence.includes(' a ') || sentence.includes(' an ')) {
      score += 10;
    }
    
    // Avoid overly complex structures in simple mode
    const complexWords = ['epistemological', 'paradigmatic', 'multifaceted'];
    if (this.state.currentComplexity === 'simple' && complexWords.some(word => sentence.includes(word))) {
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate language hints for contextual understanding
   */
  private generateLanguageHints(word: Word, complexity: 'simple' | 'moderate' | 'complex'): string[] {
    const hints: string[] = [];
    
    switch (complexity) {
      case 'simple':
        hints.push('Read the sentence aloud to hear what sounds right');
        hints.push('Think about which word fits the meaning');
        break;
      case 'moderate':
        hints.push('Consider the grammatical structure of the sentence');
        hints.push('Look for clues about word type (noun, verb, adjective)');
        break;
      case 'complex':
        hints.push('Analyze the sophisticated vocabulary and sentence structure');
        hints.push('Consider subtle nuances in meaning and context');
        break;
    }

    hints.push('Use context clues to determine the best fit');
    
    if (word.term.length > 7) {
      hints.push('Break down longer words into familiar parts');
    }

    return hints;
  }

  /**
   * Generate contextual support messages
   */
  private generateContextualSupport(word: Word, complexity: 'simple' | 'moderate' | 'complex'): string[] {
    const support: string[] = [];
    
    support.push('Context is key to understanding meaning');
    support.push('Read the entire sentence before choosing');
    
    switch (complexity) {
      case 'simple':
        support.push('Simple sentences help build confidence');
        break;
      case 'moderate':
        support.push('Moderate complexity builds understanding');
        break;
      case 'complex':
        support.push('Complex sentences develop advanced comprehension');
        break;
    }
    
    if (word.level && word.level >= 4) {
      support.push('Advanced vocabulary expands your expression');
    }
    
    support.push('Each sentence teaches natural language usage');
    
    return support;
  }

  /**
   * Initialize sentence patterns for different complexity levels
   */
  private initializeSentencePatterns(): Array<{
    pattern: string;
    complexity: 'simple' | 'moderate' | 'complex';
    usage: number;
  }> {
    return [
      { pattern: 'The [WORD] is [ADJECTIVE]', complexity: 'simple', usage: 0 },
      { pattern: '[WORD] helps us understand [CONCEPT]', complexity: 'simple', usage: 0 },
      { pattern: 'Understanding [WORD] requires [ACTION]', complexity: 'moderate', usage: 0 },
      { pattern: 'The significance of [WORD] becomes clear when [CONDITION]', complexity: 'moderate', usage: 0 },
      { pattern: 'While [WORD] traditionally denotes [DEFINITION], [CONTRAST]', complexity: 'complex', usage: 0 },
      { pattern: 'The multifaceted nature of [WORD] encompasses [EXPLANATION]', complexity: 'complex', usage: 0 }
    ];
  }

  /**
   * Update sentence complexity based on progress and performance
   */
  private updateSentenceComplexity(sessionProgress: number, contextualDifficulty: number): void {
    if (sessionProgress >= 0.8 && contextualDifficulty > 60) {
      this.state.currentComplexity = 'complex';
    } else if (sessionProgress >= 0.4 && contextualDifficulty > 40) {
      this.state.currentComplexity = 'moderate';
    } else {
      this.state.currentComplexity = 'simple';
    }

    logger.debug(`📝 Fill in the Blank complexity updated: ${this.state.currentComplexity}`);
  }

  /**
   * Update language pattern understanding
   */
  private updateLanguagePatterns(wordId: string, sentenceComplexity: 'simple' | 'moderate' | 'complex', contextualAccuracy: number): void {
    this.state.languagePatterns.push({
      wordId,
      sentenceType: sentenceComplexity,
      comprehensionScore: contextualAccuracy,
      naturalness: this.calculateNaturalnessScore(''), // Would use actual sentence
      timestamp: Date.now()
    });

    // Keep only recent patterns (last 50)
    if (this.state.languagePatterns.length > 50) {
      this.state.languagePatterns = this.state.languagePatterns.slice(-50);
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
   * Reset Fill in the Blank session
   */
  reset(): void {
    this.state = {
      isActive: false,
      startTime: 0,
      currentComplexity: 'simple',
      sentencePatterns: [],
      contextualStrategies: [],
      languagePatterns: [],
      analyticsBuffer: []
    };
    logger.debug('📝 Fill in the Blank service reset');
  }

  /**
   * Get current state for debugging
   */
  getState(): FillInTheBlankState {
    return { ...this.state };
  }
}

export const fillInTheBlankService = new FillInTheBlankService();