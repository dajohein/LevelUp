jest.mock('../../services/storageService', () => ({
  gameStateStorage: { load: jest.fn(() => ({})), save: jest.fn() },
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: { safeLoadWordProgress: jest.fn(() => ({})) },
}));
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../services/wordSelectionManager', () => ({
  selectWordForRegularSession: jest.fn(),
  selectWordForMixedPractice: jest.fn(),
}));

import gameReducer, { checkAnswer, setCurrentWord } from '../gameSlice';

const word = {
  id: 'es:perro',
  term: 'perro',
  definition: 'hond',
  direction: 'definition-to-term' as const,
};

const start = () => {
  let state = gameReducer(undefined, { type: 'test/initialize' });
  state = { ...state, language: 'es', lives: 5 };
  return gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'open-answer' }));
};

const answer = (state: ReturnType<typeof start>, text: string, opts = {}) =>
  gameReducer(
    gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'open-answer' })),
    checkAnswer({ answer: text, ...opts } as never)
  );

describe('review streak in gameSlice', () => {
  it('starts a streak on the first correct answer and resets it on a lapse', () => {
    const correct = answer(start(), 'perro');
    expect(correct.wordProgress[word.id].consecutiveCorrect).toBe(1);
    expect(correct.wordProgress[word.id].streakUpdatedAt).toBeDefined();

    const lapsed = answer(correct, 'gato');
    expect(lapsed.wordProgress[word.id].consecutiveCorrect).toBe(0);
  });

  it('does not grow the streak again within the same sitting', () => {
    const first = answer(start(), 'perro');
    const second = answer(first, 'perro');
    expect(second.wordProgress[word.id].consecutiveCorrect).toBe(1);
  });

  it('hinted and retried correct answers leave the review streak alone', () => {
    const first = answer(start(), 'perro');
    for (const extra of [{ hintsUsed: 1 }, { isRetry: true }]) {
      const next = answer(first, 'perro', extra);
      expect(next.wordProgress[word.id].consecutiveCorrect).toBe(1);
    }
  });

  it('the per-direction streak uses the same gate as the overall one', () => {
    const first = answer(start(), 'perro');
    const second = answer(first, 'perro'); // same sitting: gated
    const direction = second.wordProgress[word.id].directions?.['definition-to-term'];
    expect(direction?.consecutiveCorrect).toBe(1);
    expect(direction?.longestStreak).toBe(1);
    expect(direction?.consecutiveCorrect).toBe(second.wordProgress[word.id].consecutiveCorrect);
  });

  it('demotes the learning phase when mastery falls back to zero', () => {
    const state = answer(start(), 'perro');
    const warmed = {
      ...state,
      wordProgress: {
        ...state.wordProgress,
        [word.id]: { ...state.wordProgress[word.id], xp: 5, learningPhase: 'maintenance' as const },
      },
    };
    const missed = answer(warmed, 'gato');
    expect(missed.wordProgress[word.id].xp).toBe(0);
    expect(missed.wordProgress[word.id].learningPhase).toBe('introduction');
  });
});
