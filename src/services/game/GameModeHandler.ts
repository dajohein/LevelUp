/**
 * Manages quiz mode selection, validation, and mode-specific behavior.
 * Extracted from Game.tsx to improve maintainability and testability.
 */
export class GameModeHandler {
  
  /**
   * Determine the current quiz mode to use based on enhanced word info or fallback
   */
  getCurrentQuizMode(enhancedWordInfo: any, fallbackQuizMode: string): string {
    return enhancedWordInfo?.quizMode || fallbackQuizMode;
  }

  /**
   * Get the current word to use based on enhanced word info or fallback
   */
  getCurrentWord(enhancedWordInfo: any, fallbackCurrentWord: any): any {
    return enhancedWordInfo?.word || fallbackCurrentWord;
  }

  /**
   * Check if a quiz mode is unidirectional (Dutch -> Target language only)
   */
  isUnidirectionalMode(quizMode: string): boolean {
    return [
      'multiple-choice', 
      'fill-in-the-blank', 
      'letter-scramble',
      'contextual-analysis',
      'usage-example',
      'synonym-antonym'
    ].includes(quizMode);
  }

  /**
   * Get the question text based on quiz mode and word direction
   */
  getQuizQuestion(word: any, quizMode: string): string {
    if (this.isUnidirectionalMode(quizMode)) {
      // For unidirectional modes, always show Dutch as the question
      return word?.dutch || word?.term || '';
    }
    
    // For bidirectional modes, follow word direction
    return this.getQuestionWord(word);
  }

  /**
   * Get the answer text based on quiz mode and word direction
   */
  getQuizAnswer(word: any, quizMode: string): string {
    if (this.isUnidirectionalMode(quizMode)) {
      // For unidirectional modes, answer is always the target language
      return word?.term || '';
    }
    
    // For bidirectional modes, follow word direction
    return this.getAnswerWord(word);
  }

  /**
   * Get question word based on word direction (bidirectional modes)
   */
  getQuestionWord(word: any): string {
    if (!word) return '';
    
    // Default to showing target language as question for bidirectional
    return word.term || '';
  }

  /**
   * Get answer word based on word direction (bidirectional modes)
   */
  getAnswerWord(word: any): string {
    if (!word) return '';
    
    // Default to Dutch as answer for bidirectional
    return word.dutch || '';
  }

  /**
   * Validate quiz mode configuration for current session
   */
  validateQuizModeConfig(
    sessionId: string,
    quizMode: string,
    currentWord: any
  ): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Validate word has required fields for quiz mode
    if (!currentWord) {
      errors.push('No current word available');
      return { isValid: false, errors, suggestions };
    }

    // Mode-specific validations
    switch (quizMode) {
      case 'multiple-choice':
        if (!currentWord.term || !currentWord.dutch) {
          errors.push('Multiple choice requires both term and dutch translation');
        }
        break;
        
      case 'fill-in-the-blank':
        if (!currentWord.context) {
          suggestions.push('Fill-in-the-blank works best with context sentences');
        }
        break;
        
      case 'letter-scramble':
        if (!currentWord.term || currentWord.term.length < 3) {
          errors.push('Letter scramble requires terms with at least 3 characters');
        }
        break;
        
      case 'contextual-analysis':
      case 'usage-example':
        if (!currentWord.context) {
          errors.push('Contextual modes require context sentences');
        }
        break;
    }

    // Session-specific validations
    if (sessionId === 'deep-dive' && !['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(quizMode)) {
      suggestions.push('Deep dive sessions work best with advanced quiz modes');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Get recommended quiz modes for a session type
   */
  getRecommendedQuizModes(sessionId: string): string[] {
    const modeRecommendations: Record<string, string[]> = {
      'quick-dash': ['multiple-choice', 'letter-scramble'],
      'precision-mode': ['fill-in-the-blank', 'contextual-analysis'],
      'deep-dive': ['contextual-analysis', 'usage-example', 'synonym-antonym'],
      'streak-challenge': ['multiple-choice', 'fill-in-the-blank'],
      'boss-battle': ['multiple-choice', 'letter-scramble', 'fill-in-the-blank'],
      'standard': ['multiple-choice', 'fill-in-the-blank', 'letter-scramble']
    };

    return modeRecommendations[sessionId] || modeRecommendations['standard'];
  }

  /**
   * Calculate difficulty score for a quiz mode
   */
  getQuizModeDifficulty(quizMode: string): number {
    const difficultyScores: Record<string, number> = {
      'multiple-choice': 1,      // Easiest - recognition
      'letter-scramble': 2,      // Easy - pattern recognition
      'fill-in-the-blank': 3,    // Medium - recall with context
      'contextual-analysis': 4,  // Hard - comprehension
      'usage-example': 4,        // Hard - application
      'synonym-antonym': 5       // Hardest - relational understanding
    };

    return difficultyScores[quizMode] || 3;
  }

  /**
   * Check if quiz mode supports options/choices
   */
  supportsOptions(quizMode: string): boolean {
    return ['multiple-choice', 'synonym-antonym'].includes(quizMode);
  }

  /**
   * Check if quiz mode requires context
   */
  requiresContext(quizMode: string): boolean {
    return ['fill-in-the-blank', 'contextual-analysis', 'usage-example'].includes(quizMode);
  }

  /**
   * Get optimal timing for quiz mode (in milliseconds)
   */
  getOptimalTiming(quizMode: string, isCorrect: boolean): number {
    const baseTimings: Record<string, { correct: number; incorrect: number }> = {
      'multiple-choice': { correct: 1200, incorrect: 3000 },
      'letter-scramble': { correct: 1500, incorrect: 3500 },
      'fill-in-the-blank': { correct: 2500, incorrect: 4500 },
      'contextual-analysis': { correct: 3000, incorrect: 5000 },
      'usage-example': { correct: 3000, incorrect: 5000 },
      'synonym-antonym': { correct: 2000, incorrect: 4000 }
    };

    const timing = baseTimings[quizMode] || baseTimings['multiple-choice'];
    return isCorrect ? timing.correct : timing.incorrect;
  }
}

// Export singleton instance
export const gameModeHandler = new GameModeHandler();