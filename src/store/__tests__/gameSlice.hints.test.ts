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
  id: 'de:hund',
  term: 'Hund',
  definition: 'hond',
  direction: 'definition-to-term' as const,
};

const start = () => {
  let state = gameReducer(undefined, { type: 'test/initialize' });
  state = { ...state, language: 'de', lives: 3, score: 0, streak: 0 };
  return gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'letter-scramble' }));
};

describe('hints and mastery', () => {
  it('a correct answer with hints counts as correct but earns no mastery', () => {
    const base = start();
    const unassisted = gameReducer(base, checkAnswer({ answer: 'Hund' }));
    const assisted = gameReducer(base, checkAnswer({ answer: 'Hund', hintsUsed: 2 }));

    expect(assisted.isCorrect).toBe(true);
    expect(assisted.streak).toBe(1);
    expect(assisted.wordProgress[word.id].timesCorrect).toBe(1);
    expect(unassisted.wordProgress[word.id].xp).toBeGreaterThan(0);
    expect(assisted.wordProgress[word.id].xp).toBe(0);
    expect(assisted.wordProgress[word.id].directions?.['definition-to-term']?.xp).toBe(0);
  });

  it('a wrong answer with hints still costs mastery', () => {
    const base = start();
    const warmed = gameReducer(base, checkAnswer({ answer: 'Hund' }));
    const xpBefore = warmed.wordProgress[word.id].xp;
    const wrong = gameReducer(
      { ...warmed, currentWord: word },
      checkAnswer({ answer: 'Katze', hintsUsed: 3 })
    );

    expect(wrong.wordProgress[word.id].xp).toBeLessThan(xpBefore);
  });

  it('a re-queued retry is practice: correct, but no mastery', () => {
    const retry = gameReducer(start(), checkAnswer({ answer: 'Hund', isRetry: true }));

    expect(retry.isCorrect).toBe(true);
    expect(retry.wordProgress[word.id].xp).toBe(0);
  });
});
