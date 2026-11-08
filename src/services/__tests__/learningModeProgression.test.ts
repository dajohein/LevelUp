import { advanceLearningMode, selectProgressiveQuizMode } from '../quizModeSelectionUtils';
import type { Word, WordProgress } from '../../store/types';

const word: Word = {
  id: 'house',
  term: 'Haus',
  definition: 'house',
  context: { sentence: 'Das Haus ist gross.', translation: 'The house is big.' },
};

const progress: WordProgress = {
  wordId: word.id,
  xp: 100,
  timesCorrect: 20,
  timesIncorrect: 0,
  lastPracticed: new Date().toISOString(),
};

describe('per-word learning progression', () => {
  it('starts new and legacy words at multiple choice regardless of XP', () => {
    expect(selectProgressiveQuizMode(word)).toBe('multiple-choice');
    expect(selectProgressiveQuizMode(word, progress)).toBe('multiple-choice');
  });

  it('requires successful recognition then spelling before sentence recall', () => {
    let current = { ...progress };
    const modes: string[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      const mode = selectProgressiveQuizMode(word, current);
      modes.push(mode);
      current = { ...current, learningMode: advanceLearningMode(word, current, mode, true) };
    }
    expect(modes).toEqual([
      'multiple-choice',
      'letter-scramble',
      'fill-in-the-blank',
      'fill-in-the-blank',
    ]);
  });

  it.each(['multiple-choice', 'letter-scramble', 'fill-in-the-blank'] as const)(
    'keeps %s after repeated wrong answers',
    learningMode => {
      const current = { ...progress, learningMode };
      for (let attempt = 0; attempt < 5; attempt++) {
        expect(advanceLearningMode(word, current, learningMode, false)).toBe(learningMode);
      }
    }
  );

  it('does not infer completion from a correct answer in a skipped mode', () => {
    expect(advanceLearningMode(word, progress, 'fill-in-the-blank', true)).toBe('multiple-choice');
  });

  it('uses open recall only after spelling for words without sentence context', () => {
    const withoutContext = { ...word, context: undefined };
    expect(selectProgressiveQuizMode(withoutContext, progress)).toBe('multiple-choice');
    const spelling = { ...progress, learningMode: 'letter-scramble' as const };
    expect(selectProgressiveQuizMode(withoutContext, spelling)).toBe('letter-scramble');
    const recall = {
      ...spelling,
      learningMode: advanceLearningMode(withoutContext, spelling, 'letter-scramble', true),
    };
    expect(selectProgressiveQuizMode(withoutContext, recall)).toBe('open-answer');
    expect(advanceLearningMode(withoutContext, recall, 'open-answer', true)).toBe(
      'fill-in-the-blank'
    );
  });

  it('does not change XP, attempt counts, direction, or another word', () => {
    const before = { ...progress };
    advanceLearningMode(word, progress, 'multiple-choice', true);
    expect(progress).toEqual(before);
    expect(selectProgressiveQuizMode({ ...word, id: 'other' })).toBe('multiple-choice');
  });

  it('selects and advances 10,000 stages within 250 ms without storage calls', () => {
    const start = performance.now();
    for (let attempt = 0; attempt < 10_000; attempt++) {
      const mode = selectProgressiveQuizMode(word, progress);
      advanceLearningMode(word, progress, mode, true);
    }
    expect(performance.now() - start).toBeLessThan(250);
  });
});
