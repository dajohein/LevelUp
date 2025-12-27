import {
  streakChallengeAdapter,
  bossBattleAdapter,
  precisionModeAdapter,
  quickDashAdapter,
  deepDiveAdapter,
  fillInTheBlankAdapter,
} from '../challengeServiceAdapters';
import {
  ChallengeConfig,
  ChallengeContext,
} from '../challengeServiceInterface';
import { Word, WordProgress } from '../../store/types';

// Mock dependencies
jest.mock('../streakChallengeService');
jest.mock('../bossBattleService');
jest.mock('../precisionModeService');
jest.mock('../quickDashService');
jest.mock('../deepDiveService');
jest.mock('../fillInTheBlankService');
jest.mock('../moduleService');
jest.mock('../optionGenerationUtils');
jest.mock('../../services/logger');

describe('Challenge Service Adapters', () => {
  // Mock implementations
  const mockWord: Word = {
    id: 'word-1',
    term: 'Tisch',
    definition: 'table',
  };

  const mockWordProgress: WordProgress = {
    wordId: 'word-1',
    xp: 50,
    lastPracticed: new Date().toISOString(),
    timesCorrect: 2,
    timesIncorrect: 1,
  };

  const mockChallengeConfig: ChallengeConfig = {
    languageCode: 'de',
    wordProgress: { 'word-1': mockWordProgress },
    targetWords: 10,
    allWords: [mockWord],
    moduleId: 'grundwortschatz',
  };

  const mockChallengeContext: ChallengeContext = {
    wordsCompleted: 2,
    currentStreak: 1,
    targetWords: 10,
    wordProgress: { 'word-1': mockWordProgress },
    languageCode: 'de',
    allWords: [mockWord],
    moduleId: 'grundwortschatz',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Streak Challenge Adapter', () => {
    it('should implement IChallengeService interface', () => {
      expect(streakChallengeAdapter).toBeDefined();
      expect(typeof streakChallengeAdapter.initialize).toBe('function');
      expect(typeof streakChallengeAdapter.getNextWord).toBe('function');
      expect(typeof streakChallengeAdapter.recordCompletion).toBe('function');
      expect(typeof streakChallengeAdapter.reset).toBe('function');
    });

    it('should initialize with correct parameters', async () => {
      const { streakChallengeService } = require('../streakChallengeService');
      streakChallengeService.initializeStreak.mockReturnValue(undefined);

      await streakChallengeAdapter.initialize(mockChallengeConfig);

      expect(streakChallengeService.initializeStreak).toHaveBeenCalledWith(
        'de',
        mockChallengeConfig.wordProgress,
        mockChallengeConfig.allWords,
        'grundwortschatz'
      );
    });

    it('should get next word with options for multiple-choice quiz mode', async () => {
      const { streakChallengeService } = require('../streakChallengeService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      streakChallengeService.getNextStreakWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'multiple-choice',
        aiEnhanced: false,
        reasoning: ['test reasoning'],
      });

      generateModuleScopedOptions.mockReturnValue([
        'Tisch',
        'Stuhl',
        'Fenster',
        'Tür',
      ]);

      const result = await streakChallengeAdapter.getNextWord(mockChallengeContext);

      expect(result.word).toEqual(mockWord);
      expect(result.quizMode).toBe('multiple-choice');
      expect(result.options).toHaveLength(4);
      expect(generateModuleScopedOptions).toHaveBeenCalledWith(
        mockWord,
        'de',
        mockChallengeContext.allWords
      );
    });

    it('should record completion and return sessionContinues', () => {
      const result = streakChallengeAdapter.recordCompletion('word-1', true, 5000);

      expect(result.sessionContinues).toBe(true);
    });

    it('should reset without errors', () => {
      expect(() => streakChallengeAdapter.reset()).not.toThrow();
    });
  });

  describe('Boss Battle Adapter', () => {
    it('should implement IChallengeService interface', () => {
      expect(bossBattleAdapter).toBeDefined();
      expect(typeof bossBattleAdapter.initialize).toBe('function');
      expect(typeof bossBattleAdapter.getNextWord).toBe('function');
      expect(typeof bossBattleAdapter.recordCompletion).toBe('function');
      expect(typeof bossBattleAdapter.reset).toBe('function');
    });

    it('should initialize with boss battle service', async () => {
      const { bossBattleService } = require('../bossBattleService');
      bossBattleService.initializeBossBattle.mockResolvedValue(undefined);

      await bossBattleAdapter.initialize(mockChallengeConfig);

      expect(bossBattleService.initializeBossBattle).toHaveBeenCalledWith(
        'de',
        mockChallengeConfig.wordProgress,
        mockChallengeConfig.targetWords,
        mockChallengeConfig.allWords,
        'grundwortschatz'
      );
    });

    it('should get next word with boss phase metadata', async () => {
      const { bossBattleService } = require('../bossBattleService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      bossBattleService.getNextBossWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'multiple-choice',
        aiEnhanced: true,
        reasoning: ['boss battle reasoning'],
        bossPhase: 'phase-2',
      });

      generateModuleScopedOptions.mockReturnValue([
        'Tisch',
        'Stuhl',
        'Fenster',
        'Tür',
      ]);

      const result = await bossBattleAdapter.getNextWord(mockChallengeContext);

      expect(result.word).toEqual(mockWord);
      expect(result.metadata?.bossPhase).toBe('phase-2');
      expect(result.aiEnhanced).toBe(true);
    });

    it('should record completion and return sessionContinues', () => {
      const result = bossBattleAdapter.recordCompletion('word-1', true, 10000);

      expect(result.sessionContinues).toBe(true);
    });
  });

  describe('Precision Mode Adapter', () => {
    it('should implement IChallengeService interface', () => {
      expect(precisionModeAdapter).toBeDefined();
      expect(typeof precisionModeAdapter.initialize).toBe('function');
      expect(typeof precisionModeAdapter.getNextWord).toBe('function');
      expect(typeof precisionModeAdapter.recordCompletion).toBe('function');
      expect(typeof precisionModeAdapter.reset).toBe('function');
      expect(typeof (precisionModeAdapter as any).hasSessionFailed).toBe('function');
    });

    it('should initialize precision mode with correct parameters', async () => {
      const { precisionModeService } = require('../precisionModeService');
      precisionModeService.initializePrecisionMode.mockResolvedValue(undefined);

      await precisionModeAdapter.initialize(mockChallengeConfig);

      expect(precisionModeService.initializePrecisionMode).toHaveBeenCalledWith(
        'de',
        mockChallengeConfig.wordProgress,
        mockChallengeConfig.targetWords,
        mockChallengeConfig.allWords,
        'grundwortschatz'
      );
    });

    it('should get next word for precision mode', async () => {
      const { precisionModeService } = require('../precisionModeService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      precisionModeService.getNextPrecisionWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'multiple-choice',
        aiEnhanced: true,
        reasoning: ['precision reasoning'],
        confidenceBoost: ['take your time'],
        errorPreventionHints: ['check capitalization'],
        optimalPacing: 30,
      });

      generateModuleScopedOptions.mockReturnValue([
        'Tisch',
        'Stuhl',
        'Fenster',
        'Tür',
      ]);

      const result = await precisionModeAdapter.getNextWord(mockChallengeContext);

      expect(result.word).toEqual(mockWord);
      expect(result.metadata?.confidenceBoost).toEqual(['take your time']);
      expect(result.metadata?.errorPreventionHints).toEqual(['check capitalization']);
    });

    it('should record completion and return sessionFailed on incorrect answer', () => {
      const { precisionModeService } = require('../precisionModeService');
      precisionModeService.recordWordCompletion.mockReturnValue(false); // Session continues = false

      const result = precisionModeAdapter.recordCompletion('word-1', false, 5000);

      expect(result.sessionContinues).toBe(false);
      expect(result.sessionFailed).toBe(true);
    });

    it('should return sessionContinues on correct answer', () => {
      const { precisionModeService } = require('../precisionModeService');
      precisionModeService.recordWordCompletion.mockReturnValue(true); // Session continues = true

      const result = precisionModeAdapter.recordCompletion('word-1', true, 5000);

      expect(result.sessionContinues).toBe(true);
    });

    it('should expose hasSessionFailed method', () => {
      const { precisionModeService } = require('../precisionModeService');
      precisionModeService.hasSessionFailed.mockReturnValue(true);

      const failed = (precisionModeAdapter as any).hasSessionFailed();

      expect(failed).toBe(true);
      expect(precisionModeService.hasSessionFailed).toHaveBeenCalled();
    });
  });

  describe('Quick Dash Adapter', () => {
    it('should implement IChallengeService interface', () => {
      expect(quickDashAdapter).toBeDefined();
      expect(typeof quickDashAdapter.initialize).toBe('function');
      expect(typeof quickDashAdapter.getNextWord).toBe('function');
      expect(typeof quickDashAdapter.recordCompletion).toBe('function');
      expect(typeof quickDashAdapter.reset).toBe('function');
    });

    it('should initialize with quick dash parameters', async () => {
      const { quickDashService } = require('../quickDashService');
      quickDashService.initializeQuickDash.mockResolvedValue(undefined);

      await quickDashAdapter.initialize(mockChallengeConfig);

      expect(quickDashService.initializeQuickDash).toHaveBeenCalledWith(
        'de',
        mockChallengeConfig.wordProgress,
        mockChallengeConfig.targetWords,
        5, // Default time limit when not provided
        mockChallengeConfig.allWords,
        'grundwortschatz'
      );
    });

    it('should get next word with time-based context', async () => {
      const { quickDashService } = require('../quickDashService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      quickDashService.getNextQuickDashWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'multiple-choice',
        options: ['option1', 'option2', 'option3', 'option4'],
        aiEnhanced: false,
        reasoning: ['quick dash reasoning'],
      });

      generateModuleScopedOptions.mockReturnValue([
        'Tisch',
        'Stuhl',
        'Fenster',
        'Tür',
      ]);

      const contextWithTime = { ...mockChallengeContext, timeRemaining: 120 };
      const result = await quickDashAdapter.getNextWord(contextWithTime);

      expect(result.word).toEqual(mockWord);
      expect(quickDashService.getNextQuickDashWord).toHaveBeenCalledWith(
        mockChallengeContext.wordsCompleted,
        mockChallengeContext.wordProgress,
        120
      );
    });

    it('should record completion', () => {
      const { quickDashService } = require('../quickDashService');
      quickDashService.recordWordCompletion.mockReturnValue(undefined);

      const result = quickDashAdapter.recordCompletion('word-1', true, 3000);

      expect(result.sessionContinues).toBe(true);
      expect(quickDashService.recordWordCompletion).toHaveBeenCalledWith('word-1', true, 3000);
    });

    it('should reset quick dash service', () => {
      const { quickDashService } = require('../quickDashService');
      quickDashService.reset.mockReturnValue(undefined);

      quickDashAdapter.reset();

      expect(quickDashService.reset).toHaveBeenCalled();
    });
  });

  describe('Deep Dive Adapter', () => {
    it('should implement IChallengeService interface', () => {
      expect(deepDiveAdapter).toBeDefined();
      expect(typeof deepDiveAdapter.initialize).toBe('function');
      expect(typeof deepDiveAdapter.getNextWord).toBe('function');
      expect(typeof deepDiveAdapter.recordCompletion).toBe('function');
      expect(typeof deepDiveAdapter.reset).toBe('function');
    });

    it('should initialize with deep dive parameters', async () => {
      const { deepDiveService } = require('../deepDiveService');
      deepDiveService.initializeDeepDive.mockResolvedValue(undefined);

      await deepDiveAdapter.initialize(mockChallengeConfig);

      expect(deepDiveService.initializeDeepDive).toHaveBeenCalledWith(
        'de',
        mockChallengeConfig.targetWords,
        3, // difficulty defaults to 3
        'grundwortschatz'
      );
    });

    it('should get next word and handle standard quiz modes', async () => {
      const { deepDiveService } = require('../deepDiveService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      deepDiveService.getNextDeepDiveWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'multiple-choice',
        aiEnhanced: true,
        reasoning: ['deep dive reasoning'],
      });

      generateModuleScopedOptions.mockReturnValue([
        'Tisch',
        'Stuhl',
        'Fenster',
        'Tür',
      ]);

      const result = await deepDiveAdapter.getNextWord(mockChallengeContext);

      expect(result.word).toEqual(mockWord);
      expect(result.quizMode).toBe('multiple-choice');
      expect(result.metadata?.enhancementLevel).toBe('standard');
    });

    it('should handle enhanced quiz modes (contextual-analysis)', async () => {
      const { deepDiveService } = require('../deepDiveService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      deepDiveService.getNextDeepDiveWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'contextual-analysis',
        aiEnhanced: true,
        reasoning: ['contextual reasoning'],
      });

      generateModuleScopedOptions.mockReturnValue([
        'Tisch',
        'Stuhl',
        'Fenster',
        'Tür',
      ]);

      const result = await deepDiveAdapter.getNextWord(mockChallengeContext);

      expect(result.metadata?.enhancementLevel).toBe('advanced');
      expect(result.metadata?.originalQuizMode).toBe('contextual-analysis');
      expect(['multiple-choice', 'fill-in-the-blank']).toContain(result.quizMode);
    });

    it('should record completion with deep dive service', () => {
      const { deepDiveService } = require('../deepDiveService');
      deepDiveService.recordWordCompletion.mockReturnValue(undefined);

      const result = deepDiveAdapter.recordCompletion('word-1', true, 15000);

      expect(result.sessionContinues).toBe(true);
      expect(deepDiveService.recordWordCompletion).toHaveBeenCalledWith('word-1', true, 15000);
    });
  });

  describe('Fill In The Blank Adapter', () => {
    it('should implement IChallengeService interface', () => {
      expect(fillInTheBlankAdapter).toBeDefined();
      expect(typeof fillInTheBlankAdapter.initialize).toBe('function');
      expect(typeof fillInTheBlankAdapter.getNextWord).toBe('function');
      expect(typeof fillInTheBlankAdapter.recordCompletion).toBe('function');
      expect(typeof fillInTheBlankAdapter.reset).toBe('function');
    });

    it('should initialize fill in the blank service', async () => {
      const { fillInTheBlankService } = require('../fillInTheBlankService');
      fillInTheBlankService.initializeFillInTheBlank.mockResolvedValue(undefined);

      await fillInTheBlankAdapter.initialize(mockChallengeConfig);

      expect(fillInTheBlankService.initializeFillInTheBlank).toHaveBeenCalledWith(
        'de',
        mockChallengeConfig.targetWords
      );
    });

    it('should get next word with fill-in-the-blank quiz mode', async () => {
      const { fillInTheBlankService } = require('../fillInTheBlankService');

      fillInTheBlankService.getNextFillInTheBlankWord.mockResolvedValue({
        word: mockWord,
        options: ['table', 'chair', 'window', 'door'],
        aiEnhanced: true,
        reasoning: ['fill-in reasoning'],
      });

      const result = await fillInTheBlankAdapter.getNextWord(mockChallengeContext);

      expect(result.word).toEqual(mockWord);
      expect(result.quizMode).toBe('fill-in-the-blank');
      expect(result.options).toEqual(['table', 'chair', 'window', 'door']);
      expect(fillInTheBlankService.getNextFillInTheBlankWord).toHaveBeenCalledWith(
        mockChallengeContext.allWords,
        mockChallengeContext.wordProgress,
        mockChallengeContext.wordsCompleted,
        mockChallengeContext.targetWords
      );
    });

    it('should record completion', () => {
      const result = fillInTheBlankAdapter.recordCompletion('word-1', true, 5000);

      expect(result.sessionContinues).toBe(true);
    });

    it('should reset fill in the blank service', () => {
      const { fillInTheBlankService } = require('../fillInTheBlankService');
      fillInTheBlankService.reset.mockReturnValue(undefined);

      fillInTheBlankAdapter.reset();

      expect(fillInTheBlankService.reset).toHaveBeenCalled();
    });
  });

  describe('Cross-adapter consistency', () => {
    it('all adapters should return ChallengeResult with required fields', async () => {
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');
      generateModuleScopedOptions.mockReturnValue([
        'option1',
        'option2',
        'option3',
        'option4',
      ]);

      const mockServiceResult = {
        word: mockWord,
        quizMode: 'multiple-choice',
        aiEnhanced: false,
        reasoning: ['test'],
      };

      // Mock all services
      const { streakChallengeService } = require('../streakChallengeService');
      const { bossBattleService } = require('../bossBattleService');
      const { quickDashService } = require('../quickDashService');

      streakChallengeService.getNextStreakWord.mockResolvedValue(mockServiceResult);
      bossBattleService.getNextBossWord.mockResolvedValue(mockServiceResult);
      quickDashService.getNextQuickDashWord.mockResolvedValue(mockServiceResult);

      const adapters = [streakChallengeAdapter, bossBattleAdapter, quickDashAdapter];

      for (const adapter of adapters) {
        const result = await adapter.getNextWord(mockChallengeContext);

        expect(result).toHaveProperty('word');
        expect(result).toHaveProperty('options');
        expect(result).toHaveProperty('quizMode');
        expect(result.quizMode).toMatch(/^(multiple-choice|letter-scramble|open-answer|fill-in-the-blank)$/);
        expect(Array.isArray(result.options)).toBe(true);
      }
    });

    it('all adapters should implement recordCompletion consistently', () => {
      const adapters = [
        streakChallengeAdapter,
        bossBattleAdapter,
        quickDashAdapter,
        deepDiveAdapter,
        fillInTheBlankAdapter,
      ];

      for (const adapter of adapters) {
        const result = adapter.recordCompletion('word-1', true, 5000);

        expect(result).toHaveProperty('sessionContinues');
        expect(typeof result.sessionContinues).toBe('boolean');
      }
    });

    it('all adapters should implement initialize method', async () => {
      const adapters = [
        streakChallengeAdapter,
        bossBattleAdapter,
        precisionModeAdapter,
        quickDashAdapter,
        deepDiveAdapter,
        fillInTheBlankAdapter,
      ];

      for (const adapter of adapters) {
        expect(typeof adapter.initialize).toBe('function');
      }
    });

    it('all adapters should implement reset method', () => {
      const adapters = [
        streakChallengeAdapter,
        bossBattleAdapter,
        precisionModeAdapter,
        quickDashAdapter,
        deepDiveAdapter,
        fillInTheBlankAdapter,
      ];

      for (const adapter of adapters) {
        expect(typeof adapter.reset).toBe('function');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle missing allWords gracefully in context', async () => {
      const { deepDiveService } = require('../deepDiveService');
      const { generateModuleScopedOptions } = require('../optionGenerationUtils');

      deepDiveService.getNextDeepDiveWord.mockResolvedValue({
        word: mockWord,
        quizMode: 'multiple-choice',
        aiEnhanced: false,
      });

      generateModuleScopedOptions.mockReturnValue(['option1', 'option2', 'option3', 'option4']);

      const contextWithoutWords = { ...mockChallengeContext, allWords: undefined };
      const result = await deepDiveAdapter.getNextWord(contextWithoutWords);

      expect(result.word).toBeDefined();
      expect(result.options).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      const { streakChallengeService } = require('../streakChallengeService');

      streakChallengeService.getNextStreakWord.mockRejectedValue(new Error('Service error'));

      await expect(
        streakChallengeAdapter.getNextWord(mockChallengeContext)
      ).rejects.toThrow('Service error');
    });
  });
});
