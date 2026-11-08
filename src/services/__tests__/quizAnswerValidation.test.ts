import { validateQuizAnswer } from '../quizAnswerValidation';
import type { Word } from '../wordService';

describe('validateQuizAnswer', () => {
  it.each([
    ['de', 'term-to-definition', 'Hund'],
    ['de', 'definition-to-term', 'Haus'],
    ['es', 'term-to-definition', 'perro'],
    ['es', 'definition-to-term', 'gato'],
  ] as const)(
    'trims fill-in answers for %s content in %s direction',
    (language, direction, term) => {
      const word: Word = {
        id: `${language}-${term.toLowerCase()}`,
        term,
        definition: 'example',
        direction,
      };
      const result = validateQuizAnswer(` ${term} `, word, 'fill-in-the-blank', language);

      expect(result.isCorrect).toBe(true);
      expect(result.capitalizationCorrect).toBe(true);
    }
  );

  it('keeps German capitalization feedback after trimming', () => {
    const result = validateQuizAnswer(
      ' hund ',
      {
        id: 'de-hund',
        term: 'Hund',
        definition: 'dog',
      },
      'multiple-choice',
      'de'
    );

    expect(result.isCorrect).toBe(true);
    expect(result.capitalizationCorrect).toBe(false);
  });

  it('accepts each authored open-answer alternative without applying it to other modes', () => {
    const word: Word = {
      id: 'gesundheit:101',
      term: 'komisch',
      definition: 'raar, vreemd',
      acceptedAnswers: ['raar', 'vreemd'],
      direction: 'term-to-definition',
    };

    expect(validateQuizAnswer(' vreemd ', word, 'open-answer', 'de').isCorrect).toBe(true);
    expect(validateQuizAnswer(' vreemd ', word, 'multiple-choice', 'de').isCorrect).toBe(false);
  });

  it.each(['contextual-analysis', 'usage-example', 'synonym-antonym'])(
    'uses the shared non-empty answer rule for %s',
    quizMode => {
      const word: Word = { id: 'de-hund', term: 'Hund', definition: 'dog' };

      expect(validateQuizAnswer(' thoughtful response ', word, quizMode, 'de').isCorrect).toBe(
        true
      );
      expect(validateQuizAnswer('   ', word, quizMode, 'de').isCorrect).toBe(false);
    }
  );
});
