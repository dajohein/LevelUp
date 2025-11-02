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
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { userLearningProfileStorage } from './storage/userLearningProfile';
import { logger } from './logger';
import { selectWordForChallenge } from './wordSelectionManager';
import { 
  calculateWordDifficulty,
  calculateTimeAllocation,
  getComplexityMultiplier,
  generateHints,
  generateSupport
} from './challengeServiceUtils';

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
  languageCode: string;
  moduleId?: string; // Module for scoped challenges
  sessionId: string;
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
    languageCode: '',
    sessionId: '',
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
    initialComplexity: 'simple' | 'moderate' | 'complex' = 'simple',
    moduleId?: string // Module for scoped challenges
  ): Promise<{
    success: boolean;
    sessionId: string;
    estimatedDuration: number;
    complexityLevels: string[];
  }> {
    try {
      const sessionId = `fill-blank-${Date.now()}`;

      this.state = {
        isActive: true,
        startTime: Date.now(),
        languageCode,
        moduleId,
        sessionId,
        currentComplexity: initialComplexity,
        sentencePatterns: this.initializeSentencePatterns(),
        contextualStrategies: [],
        languagePatterns: [],
        analyticsBuffer: []
      };
      const complexityMultiplier = getComplexityMultiplier(initialComplexity);
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
    wordProgress: { [key: string]: WordProgress },
    currentProgress: number,
    targetWords: number,
    aiEnhancementsEnabled: boolean = true
  ): Promise<FillInTheBlankResult> {
    if (!this.state.isActive) {
      throw new Error('Fill in the Blank session not initialized');
    }

    // Calculate contextual parameters
    const sessionProgress = currentProgress / targetWords;
    const sentenceComplexity = this.calculateSentenceComplexity(sessionProgress);
    
    // Determine difficulty based on sentence complexity and session progress
    let difficulty: 'easy' | 'medium' | 'hard';
    
    if (sentenceComplexity === 'complex' || sessionProgress > 0.7) {
      difficulty = 'hard'; // Complex sentences or advanced session
    } else if (sentenceComplexity === 'moderate' || sessionProgress > 0.3) {
      difficulty = 'medium'; // Moderate sentences or mid-session
    } else {
      difficulty = 'easy'; // Simple sentences or early session
    }

    logger.debug(`📝 Fill in the Blank parameters: currentProgress=${currentProgress}, targetWords=${targetWords}, sessionProgress=${sessionProgress}, sentenceComplexity=${sentenceComplexity}, difficulty=${difficulty}`);

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty,
      this.state.moduleId
    );

    if (!selectionResult) {
      throw new Error('No words available for Fill in the Blank');
    }

    const selectedWord = selectionResult.word;
    const contextualDifficulty = sessionProgress * 80 + (sentenceComplexity === 'complex' ? 30 : sentenceComplexity === 'moderate' ? 15 : 0);

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
          // AI can suggest adaptations, but we use the centrally selected word
          aiEnhanced = true;
          languageHints = generateHints({
            word: selectedWord,
            quizMode: 'fill-in-the-blank',
            context: 'normal'
          });
          contextualSupport = generateSupport({
            context: 'normal',
            challengePhase: currentProgress < 3 ? 'early' : currentProgress >= targetWords - 3 ? 'late' : 'middle'
          });
          reasoning = aiResult.reasoning || [];
          
          // Record contextual strategy
          this.state.contextualStrategies.push(`contextual-complexity-${sentenceComplexity}`);
        } else {
          // Fallback to standard Fill in the Blank logic
          languageHints = generateHints({
            word: selectedWord,
            quizMode: 'fill-in-the-blank',
            context: 'normal'
          });
          contextualSupport = generateSupport({
            context: 'normal',
            challengePhase: currentProgress < 3 ? 'early' : currentProgress >= targetWords - 3 ? 'late' : 'middle'
          });
        }
      } catch (error) {
        logger.warn('⚠️ AI enhancement failed for Fill in the Blank, using fallback:', error);
        languageHints = generateHints({
          word: selectedWord,
          quizMode: 'fill-in-the-blank',
          context: 'normal'
        });
        contextualSupport = generateSupport({
          context: 'normal',
          challengePhase: currentProgress < 3 ? 'early' : currentProgress >= targetWords - 3 ? 'late' : 'middle'
        });
      }
    } else {
      // Standard Fill in the Blank logic without AI
      languageHints = generateHints({
        word: selectedWord,
        quizMode: 'fill-in-the-blank',
        context: 'normal'
      });
      contextualSupport = generateSupport({
        context: 'normal',
        challengePhase: currentProgress < 3 ? 'early' : currentProgress >= targetWords - 3 ? 'late' : 'middle'
      });
    }

    // Generate sentence and calculate parameters
    const sentence = this.generateSentence(selectedWord, sentenceComplexity);
    const blankPosition = this.calculateBlankPosition(sentence);
    const options = this.generateOptions(selectedWord, sentenceComplexity);
    const contextualClues = this.extractContextualClues(sentence);
    
    const difficultyLevel = calculateWordDifficulty(selectedWord, wordProgress[selectedWord.id]);
    timeAllocated = calculateTimeAllocation(selectedWord, 'fill-in-blank', difficultyLevel, 'fill-in-the-blank');

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
    // timeSpent: number, // Removed unused parameter
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
  private calculateBlankPosition(sentence: string /* wordTerm: string */): number { // Removed unused parameter
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
    // const term = word.term.toLowerCase(); // Removed unused variable
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
  private extractContextualClues(sentence: string /* wordTerm: string */): string[] { // Removed unused parameter
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
      languageCode: '',
      moduleId: undefined,
      sessionId: '',
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