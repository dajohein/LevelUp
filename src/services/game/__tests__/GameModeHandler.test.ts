import { GameModeHandler } from '../GameModeHandler';
import { Word } from '../../wordService';

// Helper to build a complete Word object
function makeWord(overrides: Partial<Word> & { term: string; definition: string }): Word {
  return { id: 'word-test', ...overrides };
}

describe('GameModeHandler', () => {
  let handler: GameModeHandler;

  beforeEach(() => {
    handler = new GameModeHandler();
  });

  // ---------------------------------------------------------------------------
  // getCurrentQuizMode
  // ---------------------------------------------------------------------------
  describe('getCurrentQuizMode', () => {
    const mockWord = makeWord({ term: 'Hund', definition: 'dog' });

    it('returns enhanced quiz mode when enhancedWordInfo has quizMode', () => {
      expect(handler.getCurrentQuizMode({ quizMode: 'letter-scramble' }, 'multiple-choice')).toBe(
        'letter-scramble'
      );
    });

    it('falls back to provided quizMode when enhancedWordInfo is null', () => {
      expect(handler.getCurrentQuizMode(null, 'fill-in-the-blank')).toBe('fill-in-the-blank');
    });

    it('falls back to provided quizMode when enhancedWordInfo is undefined', () => {
      expect(handler.getCurrentQuizMode(undefined, 'open-answer')).toBe('open-answer');
    });

    it('falls back to provided quizMode when enhancedWordInfo has no quizMode field', () => {
      expect(handler.getCurrentQuizMode({ word: mockWord }, 'multiple-choice')).toBe(
        'multiple-choice'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentWord
  // ---------------------------------------------------------------------------
  describe('getCurrentWord', () => {
    const mockWord = makeWord({ term: 'Hund', definition: 'dog' });

    it('returns word from enhancedWordInfo when available', () => {
      expect(handler.getCurrentWord({ word: mockWord }, null)).toEqual(mockWord);
    });

    it('falls back to fallbackCurrentWord when enhancedWordInfo is null', () => {
      expect(handler.getCurrentWord(null, mockWord)).toEqual(mockWord);
    });

    it('falls back to fallbackCurrentWord when enhancedWordInfo has no word', () => {
      expect(handler.getCurrentWord({ quizMode: 'multiple-choice' }, mockWord)).toEqual(mockWord);
    });
  });

  // ---------------------------------------------------------------------------
  // isUnidirectionalMode
  // ---------------------------------------------------------------------------
  describe('isUnidirectionalMode', () => {
    it.each([
      'multiple-choice',
      'fill-in-the-blank',
      'letter-scramble',
      'open-answer',
      'contextual-analysis',
      'usage-example',
      'synonym-antonym',
    ])('returns true for unidirectional mode: %s', mode => {
      expect(handler.isUnidirectionalMode(mode)).toBe(true);
    });

    it('returns false for unknown mode', () => {
      expect(handler.isUnidirectionalMode('unknown-mode')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(handler.isUnidirectionalMode('')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getQuizQuestion
  // ---------------------------------------------------------------------------
  describe('getQuizQuestion', () => {
    const wordDTT = makeWord({
      term: 'Hund',
      definition: 'dog',
      direction: 'definition-to-term',
    });

    const wordTTD = makeWord({
      term: 'Hund',
      definition: 'dog',
      direction: 'term-to-definition',
    });

    it('returns definition for definition-to-term direction in multiple-choice', () => {
      expect(handler.getQuizQuestion(wordDTT, 'multiple-choice')).toBe('dog');
    });

    it('returns term for term-to-definition direction in multiple-choice', () => {
      expect(handler.getQuizQuestion(wordTTD, 'multiple-choice')).toBe('Hund');
    });

    it('returns definition for default direction (no direction field) in multiple-choice', () => {
      const word = makeWord({ term: 'Hund', definition: 'dog' });
      expect(handler.getQuizQuestion(word, 'multiple-choice')).toBe('dog');
    });

    it('appends context hint for contextual-analysis mode', () => {
      const question = handler.getQuizQuestion(wordDTT, 'contextual-analysis');
      expect(question).toContain('analyze the context and meaning');
    });

    it('appends usage hint for usage-example mode', () => {
      const question = handler.getQuizQuestion(wordDTT, 'usage-example');
      expect(question).toContain('provide translation and usage example');
    });

    it('appends synonym hint for synonym-antonym mode', () => {
      const question = handler.getQuizQuestion(wordDTT, 'synonym-antonym');
      expect(question).toContain('translate and identify related concepts');
    });
  });

  // ---------------------------------------------------------------------------
  // getQuizAnswer
  // ---------------------------------------------------------------------------
  describe('getQuizAnswer', () => {
    it('returns term for fill-in-the-blank regardless of direction', () => {
      const word = makeWord({
        term: 'Hund',
        definition: 'dog',
        direction: 'definition-to-term',
      });
      expect(handler.getQuizAnswer(word, 'fill-in-the-blank')).toBe('Hund');
    });

    it('returns term for definition-to-term direction in unidirectional modes', () => {
      const word = makeWord({
        term: 'Katze',
        definition: 'cat',
        direction: 'definition-to-term',
      });
      expect(handler.getQuizAnswer(word, 'multiple-choice')).toBe('Katze');
    });

    it('returns definition for term-to-definition direction in unidirectional modes', () => {
      const word = makeWord({
        term: 'Katze',
        definition: 'cat',
        direction: 'term-to-definition',
      });
      expect(handler.getQuizAnswer(word, 'multiple-choice')).toBe('cat');
    });

    it('returns term by default when no direction is set', () => {
      const word = makeWord({ term: 'Hund', definition: 'dog' });
      expect(handler.getQuizAnswer(word, 'multiple-choice')).toBe('Hund');
    });
  });

  // ---------------------------------------------------------------------------
  // getQuestionWord / getAnswerWord
  // ---------------------------------------------------------------------------
  describe('getQuestionWord', () => {
    it('returns definition for definition-to-term direction', () => {
      const word = makeWord({
        term: 'Hund',
        definition: 'dog',
        direction: 'definition-to-term',
      });
      expect(handler.getQuestionWord(word)).toBe('dog');
    });

    it('returns term for term-to-definition direction', () => {
      const word = makeWord({
        term: 'Hund',
        definition: 'dog',
        direction: 'term-to-definition',
      });
      expect(handler.getQuestionWord(word)).toBe('Hund');
    });

    it('returns empty string for null word', () => {
      expect(handler.getQuestionWord(null)).toBe('');
    });

    it('returns empty string for undefined word', () => {
      expect(handler.getQuestionWord(undefined)).toBe('');
    });
  });

  describe('getAnswerWord', () => {
    it('returns term for definition-to-term direction', () => {
      const word = makeWord({
        term: 'Hund',
        definition: 'dog',
        direction: 'definition-to-term',
      });
      expect(handler.getAnswerWord(word)).toBe('Hund');
    });

    it('returns definition for term-to-definition direction', () => {
      const word = makeWord({
        term: 'Hund',
        definition: 'dog',
        direction: 'term-to-definition',
      });
      expect(handler.getAnswerWord(word)).toBe('dog');
    });

    it('returns empty string for null word', () => {
      expect(handler.getAnswerWord(null)).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // validateQuizModeConfig
  // ---------------------------------------------------------------------------
  describe('validateQuizModeConfig', () => {
    const validWord = makeWord({
      term: 'Hund',
      definition: 'dog',
      context: { sentence: 'Der Hund schläft.', translation: 'The dog is sleeping.' },
    });

    it('returns invalid when word is null', () => {
      const result = handler.validateQuizModeConfig('quick-dash', 'multiple-choice', null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No current word available');
    });

    it('returns invalid when word is undefined', () => {
      const result = handler.validateQuizModeConfig('quick-dash', 'multiple-choice', undefined);
      expect(result.isValid).toBe(false);
    });

    it('returns valid for multiple-choice when word has term and definition', () => {
      const result = handler.validateQuizModeConfig('quick-dash', 'multiple-choice', validWord);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for multiple-choice when word is missing definition', () => {
      // @ts-expect-error – intentionally testing incomplete data
      const wordMissingDef: Word = { id: 'w', term: 'Hund' };
      const result = handler.validateQuizModeConfig(
        'quick-dash',
        'multiple-choice',
        wordMissingDef
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/term and definition/i);
    });

    it('returns suggestion for fill-in-the-blank when context is missing', () => {
      const wordNoContext = makeWord({ term: 'Hund', definition: 'dog' });
      const result = handler.validateQuizModeConfig(
        'quick-dash',
        'fill-in-the-blank',
        wordNoContext
      );
      expect(result.isValid).toBe(true); // missing context is a suggestion, not an error
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('returns error for letter-scramble when term is too short', () => {
      const shortTermWord = makeWord({ term: 'ab', definition: 'something' });
      const result = handler.validateQuizModeConfig('quick-dash', 'letter-scramble', shortTermWord);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/at least 3 characters/i);
    });

    it('returns valid for letter-scramble with adequate term length', () => {
      const result = handler.validateQuizModeConfig('quick-dash', 'letter-scramble', validWord);
      expect(result.isValid).toBe(true);
    });

    it('returns error for contextual modes when context is missing', () => {
      const wordNoContext = makeWord({ term: 'Hund', definition: 'dog' });
      const resultCA = handler.validateQuizModeConfig(
        'deep-dive',
        'contextual-analysis',
        wordNoContext
      );
      const resultUE = handler.validateQuizModeConfig('deep-dive', 'usage-example', wordNoContext);
      expect(resultCA.isValid).toBe(false);
      expect(resultUE.isValid).toBe(false);
    });

    it('returns suggestion for deep-dive with non-advanced modes', () => {
      const result = handler.validateQuizModeConfig('deep-dive', 'multiple-choice', validWord);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getRecommendedQuizModes
  // ---------------------------------------------------------------------------
  describe('getRecommendedQuizModes', () => {
    it('returns specific modes for quick-dash', () => {
      const modes = handler.getRecommendedQuizModes('quick-dash');
      expect(modes).toContain('multiple-choice');
      expect(modes).toContain('letter-scramble');
    });

    it('returns advanced modes for deep-dive', () => {
      const modes = handler.getRecommendedQuizModes('deep-dive');
      expect(modes).toContain('contextual-analysis');
      expect(modes).toContain('usage-example');
    });

    it('returns standard modes for unknown session type', () => {
      const modes = handler.getRecommendedQuizModes('unknown-session');
      expect(modes).toContain('multiple-choice');
      expect(modes).toContain('fill-in-the-blank');
    });
  });

  // ---------------------------------------------------------------------------
  // getQuizModeDifficulty
  // ---------------------------------------------------------------------------
  describe('getQuizModeDifficulty', () => {
    it('returns 1 for multiple-choice (easiest)', () => {
      expect(handler.getQuizModeDifficulty('multiple-choice')).toBe(1);
    });

    it('returns 5 for synonym-antonym (hardest)', () => {
      expect(handler.getQuizModeDifficulty('synonym-antonym')).toBe(5);
    });

    it('returns 3 as default for unknown mode', () => {
      expect(handler.getQuizModeDifficulty('unknown-mode')).toBe(3);
    });

    it('has increasing difficulty ordering', () => {
      expect(handler.getQuizModeDifficulty('multiple-choice')).toBeLessThan(
        handler.getQuizModeDifficulty('letter-scramble')
      );
      expect(handler.getQuizModeDifficulty('letter-scramble')).toBeLessThan(
        handler.getQuizModeDifficulty('fill-in-the-blank')
      );
      expect(handler.getQuizModeDifficulty('fill-in-the-blank')).toBeLessThan(
        handler.getQuizModeDifficulty('contextual-analysis')
      );
    });
  });

  // ---------------------------------------------------------------------------
  // supportsOptions / requiresContext
  // ---------------------------------------------------------------------------
  describe('supportsOptions', () => {
    it('returns true for multiple-choice', () => {
      expect(handler.supportsOptions('multiple-choice')).toBe(true);
    });

    it('returns false for open-answer', () => {
      expect(handler.supportsOptions('open-answer')).toBe(false);
    });

    it('returns false for letter-scramble', () => {
      expect(handler.supportsOptions('letter-scramble')).toBe(false);
    });
  });

  describe('requiresContext', () => {
    it.each(['fill-in-the-blank', 'contextual-analysis', 'usage-example'])(
      'returns true for %s',
      mode => {
        expect(handler.requiresContext(mode)).toBe(true);
      }
    );

    it('returns false for multiple-choice', () => {
      expect(handler.requiresContext('multiple-choice')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getOptimalTiming
  // ---------------------------------------------------------------------------
  describe('getOptimalTiming', () => {
    it('returns shorter timing for correct answers', () => {
      const correctTime = handler.getOptimalTiming('multiple-choice', true);
      const incorrectTime = handler.getOptimalTiming('multiple-choice', false);
      expect(correctTime).toBeLessThan(incorrectTime);
    });

    it('returns longer timing for more complex modes when correct', () => {
      const mcTime = handler.getOptimalTiming('multiple-choice', true);
      const contextTime = handler.getOptimalTiming('contextual-analysis', true);
      expect(mcTime).toBeLessThan(contextTime);
    });

    it('falls back to multiple-choice timing for unknown mode', () => {
      const unknown = handler.getOptimalTiming('unknown-mode', true);
      const mc = handler.getOptimalTiming('multiple-choice', true);
      expect(unknown).toBe(mc);
    });
  });

  // ---------------------------------------------------------------------------
  // getContextForDirection
  // ---------------------------------------------------------------------------
  describe('getContextForDirection', () => {
    it('returns structured context when word has context object', () => {
      const word = makeWord({
        term: 'Hund',
        definition: 'dog',
        context: { sentence: 'Der Hund läuft.', translation: 'The dog runs.' },
      });
      const result = handler.getContextForDirection(word);
      expect(result).toBeDefined();
      expect(result?.sentence).toBe('Der Hund läuft.');
      expect(result?.translation).toBe('The dog runs.');
    });

    it('returns undefined when word has no context', () => {
      const word = makeWord({ term: 'Hund', definition: 'dog' });
      expect(handler.getContextForDirection(word)).toBeUndefined();
    });

    it('returns undefined when context is a plain string', () => {
      // @ts-expect-error – testing runtime behavior with string context
      const word: Word = { id: 'w', term: 'Hund', definition: 'dog', context: 'some description' };
      expect(handler.getContextForDirection(word)).toBeUndefined();
    });
  });
});
