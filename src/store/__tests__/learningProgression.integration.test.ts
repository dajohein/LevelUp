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
jest.mock('../../services/streakChallengeService');
jest.mock('../../services/bossBattleService');
jest.mock('../../services/precisionModeService');
jest.mock('../../services/quickDashService');
jest.mock('../../services/deepDiveService');
jest.mock('../../services/fillInTheBlankService');
jest.mock('../../services/optionGenerationUtils', () => ({
  generateModuleScopedOptions: jest.fn(() => ['Haus', 'Baum']),
  generateScrambledVersions: jest.fn(() => ['suaH']),
}));

import gameReducer, { checkAnswer, nextWord, setCurrentWord, submitAnswer } from '../gameSlice';
import { deepDiveAdapter } from '../../services/challengeServiceAdapters';
import { deepDiveService } from '../../services/deepDiveService';
import { selectWordForMixedPractice } from '../../services/wordSelectionManager';
import type { GameState, Word } from '../types';

const word: Word = {
  id: 'house',
  term: 'Haus',
  definition: 'house',
  direction: 'definition-to-term',
  context: { sentence: 'Das Haus ist gross.', translation: 'The house is big.' },
};

const initialState = (): GameState => ({
  ...gameReducer(undefined, { type: 'test/initialize' }),
  language: 'de',
});

describe('Start Learning / Deep Dive production progression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(deepDiveService.getNextDeepDiveWord).mockResolvedValue({
      word,
      quizMode: 'contextual-analysis',
      aiEnhanced: true,
      timeAllocated: 60,
      difficultyLevel: 3,
      contextualHints: [],
      comprehensionBoost: [],
      reasoning: ['AI context challenge'],
    });
  });

  it.each([
    { answerAction: checkAnswer, xp: 36 },
    { answerAction: submitAnswer, xp: 84 },
  ])(
    'enforces the sequence and preserves existing XP with $answerAction.type',
    async ({ answerAction, xp }) => {
      let state = initialState();
      const presented: string[] = [];
      for (let encounter = 0; encounter < 3; encounter++) {
        const result = await deepDiveAdapter.getNextWord({
          languageCode: 'de',
          wordsCompleted: encounter,
          currentStreak: encounter,
          targetWords: 20,
          wordProgress: state.wordProgress,
          allWords: [word],
        });
        presented.push(result.quizMode);
        state = gameReducer(state, setCurrentWord(result));
        state = gameReducer(state, answerAction({ answer: 'Haus', progressiveLearning: true }));
      }
      expect(presented).toEqual(['multiple-choice', 'letter-scramble', 'fill-in-the-blank']);
      expect(state).toMatchObject({ score: 42, correctAnswers: 3, totalAttempts: 3, lives: 3 });
      expect(state.wordProgress.house).toMatchObject({
        xp,
        timesCorrect: 3,
        timesIncorrect: 0,
        learningMode: 'fill-in-the-blank',
      });
      expect(deepDiveService.getNextDeepDiveWord).toHaveBeenCalledTimes(3);
    }
  );

  it('keeps mistakes and skips at the same stage without advancing another word', () => {
    let state = initialState();
    state = gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'multiple-choice' }));
    state = gameReducer(state, checkAnswer({ answer: 'Haus', progressiveLearning: true }));
    state = gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'letter-scramble' }));
    state = gameReducer(state, checkAnswer({ answer: 'wrong', progressiveLearning: true }));
    expect(state.wordProgress.house.learningMode).toBe('letter-scramble');
    expect(state.wordProgress.house.timesIncorrect).toBe(1);

    jest.mocked(selectWordForMixedPractice).mockReturnValue({
      word,
      alternatives: [],
      selectionReason: 'test',
      metadata: { poolSize: 1, masteryScore: 0, selectionAlgorithm: 'test', exclusionCount: 0 },
    });
    state = gameReducer(state, nextWord({ progressiveLearning: true }));
    state = gameReducer(state, nextWord({ progressiveLearning: true }));
    expect(state.quizMode).toBe('letter-scramble');
    expect(state.wordProgress.house.learningMode).toBe('letter-scramble');

    const otherWord = { ...word, id: 'other' };
    state = gameReducer(
      state,
      setCurrentWord({ word: otherWord, options: [], quizMode: 'multiple-choice' })
    );
    state = gameReducer(state, checkAnswer({ answer: 'wrong', progressiveLearning: true }));
    expect(state.wordProgress.other.learningMode).toBe('multiple-choice');
    expect(state.wordProgress.house.learningMode).toBe('letter-scramble');
  });

  it('does not record learning-stage completion for free-play or other challenge answers', () => {
    let state = initialState();
    state = gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'multiple-choice' }));
    state = gameReducer(state, checkAnswer('Haus'));
    expect(state.wordProgress.house.learningMode).toBeUndefined();
    expect(state.wordProgress.house.timesCorrect).toBe(1);
  });
});
