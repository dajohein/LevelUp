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
      'open-answer',
      'contextual-analysis',
      'usage-example',
      'synonym-antonym',
    ].includes(quizMode);
  }

  /**
   * Get the question text based on quiz mode and word direction
   */
  getQuizQuestion(word: any, quizMode: string): string {
    // For enhanced quiz modes, provide context-specific prompts
    if (quizMode === 'contextual-analysis') {
      const baseQuestion = this.isUnidirectionalMode(quizMode)
        ? word.direction === 'term-to-definition'
          ? word.term
          : word.definition
        : this.getQuestionWord(word);
      return `${baseQuestion} (analyze the context and meaning)`;
    } else if (quizMode === 'usage-example') {
      const baseQuestion = this.isUnidirectionalMode(quizMode)
        ? word.direction === 'term-to-definition'
          ? word.term
          : word.definition
        : this.getQuestionWord(word);
      return `${baseQuestion} (provide translation and usage example)`;
    } else if (quizMode === 'synonym-antonym') {
      const baseQuestion = this.isUnidirectionalMode(quizMode)
        ? word.direction === 'term-to-definition'
          ? word.term
          : word.definition
        : this.getQuestionWord(word);
      return `${baseQuestion} (translate and identify related concepts)`;
    }

    if (this.isUnidirectionalMode(quizMode)) {
      // Unidirectional modes: Show the source language as the question
      // Use word direction to determine which field contains the source language
      if (word.direction === 'term-to-definition') {
        // term=Dutch (source), definition=German (target): show Dutch (term)
        return word.term;
      } else {
        // definition-to-term (default): definition=Dutch (source), term=German (target): show Dutch (definition)
        return word.definition;
      }
    } else {
      // Bidirectional modes follow word direction
      return this.getQuestionWord(word);
    }
  }

  /**
   * Get the answer text based on quiz mode and word direction
   */
  getQuizAnswer(word: any, quizMode: string): string {
    if (quizMode === 'fill-in-the-blank') {
      // Fill-in-the-blank: ALWAYS use the target language (German) word
      // The context sentence is in German, so we blank out the German term
      return word.term; // German word that should be filled in
    } else if (this.isUnidirectionalMode(quizMode)) {
      // For learning German: All unidirectional modes should expect German answers
      // Use the word direction to determine which field contains the German word
      if (word.direction === 'term-to-definition') {
        // term=Dutch, definition=German: return German (definition)
        return word.definition;
      } else {
        // definition-to-term (default): term=German, definition=Dutch: return German (term)
        return word.term;
      }
    } else {
      // Bidirectional modes follow word direction
      return this.getAnswerWord(word);
    }
  }

  /**
   * Get question word based on word direction (bidirectional modes)
   */
  getQuestionWord(word: any): string {
    if (!word) return '';

    // Use word direction to determine question word
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.definition : word.term;
  }

  /**
   * Get answer word based on word direction (bidirectional modes)
   */
  getAnswerWord(word: any): string {
    if (!word) return '';

    // Use word direction to determine answer word
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.term : word.definition;
  }

  /**
   * Get context for word direction (preserving original complexity)
   */
  getContextForDirection(word: any): { sentence: string; translation: string } | undefined {
    // If word has explicit context field, use it
    if (word.context) {
      if (typeof word.context === 'string') {
        // Skip simple string context for now (usually Dutch descriptions)
        return undefined;
      }

      // Use structured context with German sentence and Dutch translation
      return {
        sentence: word.context.sentence || '', // German sentence as context
        translation: word.context.translation || '', // Dutch translation (revealed after)
      };
    }

    // Fallback: no context available
    return undefined;
  } /**
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
    if (
      sessionId === 'deep-dive' &&
      !['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(quizMode)
    ) {
      suggestions.push('Deep dive sessions work best with advanced quiz modes');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
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
      standard: ['multiple-choice', 'fill-in-the-blank', 'letter-scramble'],
    };

    return modeRecommendations[sessionId] || modeRecommendations['standard'];
  }

  /**
   * Calculate difficulty score for a quiz mode
   */
  getQuizModeDifficulty(quizMode: string): number {
    const difficultyScores: Record<string, number> = {
      'multiple-choice': 1, // Easiest - recognition
      'letter-scramble': 2, // Easy - pattern recognition
      'fill-in-the-blank': 3, // Medium - recall with context
      'contextual-analysis': 4, // Hard - comprehension
      'usage-example': 4, // Hard - application
      'synonym-antonym': 5, // Hardest - relational understanding
    };

    return difficultyScores[quizMode] || 3;
  }

  /**
   * Check if quiz mode supports options/choices
   */
  supportsOptions(quizMode: string): boolean {
    return ['multiple-choice'].includes(quizMode);
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
      'synonym-antonym': { correct: 2000, incorrect: 4000 },
    };

    const timing = baseTimings[quizMode] || baseTimings['multiple-choice'];
    return isCorrect ? timing.correct : timing.incorrect;
  }
}

// Export singleton instance
export const gameModeHandler = new GameModeHandler();
