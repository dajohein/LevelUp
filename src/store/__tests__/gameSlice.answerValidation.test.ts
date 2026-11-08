jest.mock('../../services/storageService', () => ({
  gameStateStorage: { load: jest.fn(() => ({})), save: jest.fn() },
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: { safeLoadWordProgress: jest.fn(() => ({})) },
}));
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../services/masteryService', () => ({
  calculateMasteryGain: jest.fn(() => 10),
}));
jest.mock('../../services/wordSelectionManager', () => ({
  selectWordForRegularSession: jest.fn(),
  selectWordForMixedPractice: jest.fn(),
}));

import gameReducer, { checkAnswer, setCurrentWord, submitAnswer } from '../gameSlice';

const healthWord = {
  id: 'gesundheit:101',
  term: 'komisch',
  definition: 'raar, vreemd',
  acceptedAnswers: ['raar', 'vreemd'],
  direction: 'term-to-definition' as const,
};

const createState = (quizMode: 'open-answer' | 'multiple-choice' | 'fill-in-the-blank') => {
  let state = gameReducer(undefined, { type: 'test/initialize' });
  state = { ...state, language: 'de', lives: 3, score: 0, streak: 0 };
  return gameReducer(state, setCurrentWord({ word: healthWord, options: [], quizMode }));
};

describe('gameSlice answer validation', () => {
  const expectAcceptedAnswerProgress = (state: ReturnType<typeof gameReducer>) => {
    expect(state.isCorrect).toBe(true);
    expect(state.lives).toBe(3);
    expect(state.streak).toBe(1);
    expect(state.correctAnswers).toBe(1);
    expect(state.totalAttempts).toBe(1);
    expect(state.wordProgress[healthWord.id].timesCorrect).toBe(1);
    expect(state.wordProgress[healthWord.id].timesIncorrect).toBe(0);
    expect(state.wordProgress[healthWord.id].directions?.['term-to-definition']?.timesCorrect).toBe(
      1
    );
    expect(state.capitalizationFeedback).toBeUndefined();
  };

  it('persists accepted open-answer translations through checkAnswer', () => {
    expectAcceptedAnswerProgress(gameReducer(createState('open-answer'), checkAnswer('vreemd')));
  });

  it('persists accepted open-answer translations through submitAnswer', () => {
    expectAcceptedAnswerProgress(
      gameReducer(createState('open-answer'), submitAnswer({ answer: 'vreemd' }))
    );
  });

  it('does not apply open-answer alternatives to multiple-choice scoring', () => {
    const state = gameReducer(createState('multiple-choice'), checkAnswer('vreemd'));

    expect(state.isCorrect).toBe(false);
    expect(state.lives).toBe(2);
    expect(state.streak).toBe(0);
    expect(state.wordProgress[healthWord.id].timesIncorrect).toBe(1);
  });

  it('scores the German term for a reverse-direction fill-in-the-blank answer', () => {
    const state = gameReducer(createState('fill-in-the-blank'), checkAnswer('komisch'));

    expect(state.isCorrect).toBe(true);
    expect(state.lives).toBe(3);
    expect(state.wordProgress[healthWord.id].timesCorrect).toBe(1);
  });
});
