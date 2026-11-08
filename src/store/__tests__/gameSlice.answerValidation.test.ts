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
import { getQuizAnswerDirection, validateQuizAnswer } from '../../services/quizAnswerValidation';
import { GameModeHandler } from '../../services/game/GameModeHandler';
import type { Word } from '../../services/wordService';

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

  it.each([
    [
      'de',
      'term-to-definition',
      {
        id: 'de-hund',
        term: 'Hund',
        definition: 'dog',
        direction: 'term-to-definition',
      },
      ' Hund ',
    ],
    [
      'de',
      'definition-to-term',
      {
        id: 'de-haus',
        term: 'Haus',
        definition: 'house',
        direction: 'definition-to-term',
      },
      ' Haus ',
    ],
    [
      'es',
      'term-to-definition',
      {
        id: 'es-perro-reverse',
        term: 'perro',
        definition: 'dog',
        direction: 'term-to-definition',
      },
      ' perro ',
    ],
    [
      'es',
      'definition-to-term',
      {
        id: 'es-perro',
        term: 'perro',
        definition: 'dog',
        direction: 'definition-to-term',
      },
      ' perro ',
    ],
  ] as const)(
    'keeps fill-in feedback, score, and persisted progress aligned for %s content in %s direction',
    (languageCode, _contentDirection, word, answer) => {
      const exerciseWord = word as Word;
      const mode = 'fill-in-the-blank';
      const feedbackValidation = new GameModeHandler().isCorrectAnswer(
        answer,
        exerciseWord,
        mode,
        languageCode
      );
      const validation = validateQuizAnswer(answer, exerciseWord, mode, languageCode);
      const staleWord: Word = {
        id: `${languageCode}-stale`,
        term: 'stale',
        definition: 'old word',
      };
      let state = gameReducer(undefined, { type: 'test/initialize' });
      state = { ...state, language: languageCode, lives: 3, score: 0, streak: 0 };
      state = gameReducer(
        state,
        setCurrentWord({ word: staleWord, options: [], quizMode: 'multiple-choice' })
      );

      const result = gameReducer(
        state,
        checkAnswer({ answer, word: exerciseWord, quizMode: mode, languageCode })
      );
      const direction = getQuizAnswerDirection(exerciseWord, mode);
      const otherDirection =
        direction === 'definition-to-term' ? 'term-to-definition' : 'definition-to-term';
      const progress = result.wordProgress[exerciseWord.id];

      expect(feedbackValidation).toBe(validation.isCorrect);
      expect(result.isCorrect).toBe(feedbackValidation);
      expect(result.lives).toBe(3);
      expect(result.correctAnswers).toBe(1);
      expect(result.totalAttempts).toBe(1);
      expect(result.score).toBe(17);
      expect(progress.timesCorrect).toBe(1);
      expect(progress.timesIncorrect).toBe(0);
      expect(progress.directions?.[direction]?.timesCorrect).toBe(1);
      expect(progress.directions?.[direction]?.timesIncorrect).toBe(0);
      expect(progress.directions?.[otherDirection]?.timesCorrect).toBe(0);
      expect(result.wordProgress[staleWord.id]).toBeUndefined();
    }
  );

  it('uses the same non-empty answer rule for feedback and persisted comprehension results', () => {
    const word: Word = {
      id: 'es-perro',
      term: 'perro',
      definition: 'dog',
      direction: 'term-to-definition',
    };
    const answer = 'A thoughtful response';
    const validation = validateQuizAnswer(answer, word, 'contextual-analysis', 'es');
    let state = gameReducer(undefined, { type: 'test/initialize' });
    state = { ...state, language: 'es', lives: 3 };
    state = gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'multiple-choice' }));

    const result = gameReducer(
      state,
      checkAnswer({
        answer,
        word,
        quizMode: 'contextual-analysis',
        languageCode: 'es',
      })
    );

    expect(result.isCorrect).toBe(validation.isCorrect);
    expect(result.lives).toBe(3);
    expect(result.wordProgress[word.id].timesCorrect).toBe(1);
    expect(result.wordProgress[word.id].timesIncorrect).toBe(0);
  });
});
