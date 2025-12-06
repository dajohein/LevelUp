import { GameSessionManager, SessionContext, SessionBonuses } from '../GameSessionManager';
import { challengeServiceManager } from '../../challengeServiceManager';

// Mock dependencies
jest.mock('../../../store/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
  },
}));

jest.mock('../../challengeServiceManager', () => ({
  challengeServiceManager: {
    getNextWord: jest.fn(),
    handleCorrectAnswer: jest.fn(),
    handleIncorrectAnswer: jest.fn(),
    isSessionTypeSupported: jest.fn(),
    initializeSession: jest.fn(),
  },
}));

jest.mock('../../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Import after mocking
import { store } from '../../../store/store';

describe('GameSessionManager', () => {
  let sessionManager: GameSessionManager;
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    (store as any).dispatch = mockDispatch;
    sessionManager = new GameSessionManager();
    jest.clearAllMocks();
  });

  describe('handleAnswerSubmission', () => {
    const mockSession = {
      id: 'quick-dash',
      name: 'Quick Dash',
      timeLimit: 5,
    };

    const mockSessionProgress = {
      wordsCompleted: 5,
      correctAnswers: 4,
      incorrectAnswers: 1,
      currentStreak: 3,
    };

    it('should handle correct answer in active session', async () => {
      const result = await sessionManager.handleAnswerSubmission(
        true,
        mockSession,
        true,
        120, // 2 minutes
        mockSessionProgress
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session/incrementWordsCompleted',
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session/addCorrectAnswer',
        })
      );

      expect(result.isComplete).toBe(false);
      expect(result.bonuses).toBeDefined();
    });

    it('should calculate time bonus for quick-dash session', async () => {
      const result = await sessionManager.handleAnswerSubmission(
        true,
        mockSession,
        true,
        60, // 1 minute elapsed, 4 minutes remaining = 240 seconds
        mockSessionProgress
      );

      expect(result.bonuses?.timeBonus).toBeGreaterThan(0);
      expect(result.bonuses?.timeBonus).toBeLessThanOrEqual(50);
    });

    it('should handle incorrect answer in active session', async () => {
      const result = await sessionManager.handleAnswerSubmission(
        false,
        mockSession,
        true,
        120,
        mockSessionProgress
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session/addIncorrectAnswer',
        })
      );

      expect(result.bonuses).toBeUndefined();
    });

    it('should not update session if not active', async () => {
      const result = await sessionManager.handleAnswerSubmission(
        true,
        mockSession,
        false,
        120,
        mockSessionProgress
      );

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.isComplete).toBe(false);
    });

    it('should not update session if no current session', async () => {
      await sessionManager.handleAnswerSubmission(
        true,
        null,
        true,
        120,
        mockSessionProgress
      );

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Session-specific bonuses', () => {
    it('should calculate streak bonus for streak-challenge', async () => {
      const streakSession = {
        id: 'streak-challenge',
        name: 'Streak Challenge',
      };

      const streakProgress = {
        currentStreak: 10,
        wordsCompleted: 10,
        correctAnswers: 10,
        incorrectAnswers: 0,
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        streakSession,
        true,
        0,
        streakProgress
      );

      expect(result.bonuses?.streakBonus).toBe(50); // 10 * 5 = 50
    });

    it('should cap streak bonus at 100 points', async () => {
      const streakSession = {
        id: 'streak-challenge',
        name: 'Streak Challenge',
      };

      const largeStreakProgress = {
        currentStreak: 25,
        wordsCompleted: 25,
        correctAnswers: 25,
        incorrectAnswers: 0,
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        streakSession,
        true,
        0,
        largeStreakProgress
      );

      expect(result.bonuses?.streakBonus).toBe(100); // Capped at 100
    });

    it('should calculate context bonus for deep-dive session', async () => {
      const deepDiveSession = {
        id: 'deep-dive',
        name: 'Deep Dive',
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        deepDiveSession,
        true,
        0,
        { wordsCompleted: 1 }
      );

      expect(result.bonuses?.contextBonus).toBe(30);
      expect(result.bonuses?.perfectRecallBonus).toBe(100);
    });

    it('should calculate precision bonus for precision-mode', async () => {
      const precisionSession = {
        id: 'precision-mode',
        name: 'Precision Mode',
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        precisionSession,
        true,
        0,
        { wordsCompleted: 1 }
      );

      expect(result.bonuses?.perfectRecallBonus).toBe(40);
    });

    it('should calculate damage bonus for boss-battle', async () => {
      const bossBattleSession = {
        id: 'boss-battle',
        name: 'Boss Battle',
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        bossBattleSession,
        true,
        0,
        { wordsCompleted: 1 }
      );

      expect(result.bonuses?.contextBonus).toBe(25);
    });

    it('should calculate comprehension bonus for fill-in-the-blank', async () => {
      const fillInSession = {
        id: 'fill-in-the-blank',
        name: 'Fill in the Blank',
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        fillInSession,
        true,
        0,
        { wordsCompleted: 1 }
      );

      expect(result.bonuses?.contextBonus).toBe(25);
    });
  });

  describe('handleEnhancedSessionCompletion', () => {
    it('should handle session completion with navigation', () => {
      const completionResult = {
        isComplete: true,
        sessionScore: 1000,
      };

      const result = sessionManager.handleEnhancedSessionCompletion(
        completionResult,
        'de',
        'de'
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session/completeSession',
        })
      );

      expect(result.isComplete).toBe(true);
      expect(result.shouldNavigate).toBe(true);
      expect(result.navigationPath).toBe('/completed/de');
    });

    it('should prefer gameLanguage over languageCode for navigation', () => {
      const completionResult = {
        isComplete: true,
      };

      const result = sessionManager.handleEnhancedSessionCompletion(
        completionResult,
        'es',
        'de'
      );

      expect(result.navigationPath).toBe('/completed/es');
    });

    it('should use languageCode when gameLanguage is undefined', () => {
      const completionResult = {
        isComplete: true,
      };

      const result = sessionManager.handleEnhancedSessionCompletion(
        completionResult,
        undefined,
        'nl'
      );

      expect(result.navigationPath).toBe('/completed/nl');
    });

    it('should return incomplete for non-complete results', () => {
      const result = sessionManager.handleEnhancedSessionCompletion(
        { isComplete: false },
        'de',
        'de'
      );

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.isComplete).toBe(false);
      expect(result.shouldNavigate).toBeUndefined();
    });

    it('should handle null result gracefully', () => {
      const result = sessionManager.handleEnhancedSessionCompletion(null, 'de', 'de');

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(result.isComplete).toBe(false);
    });

    it('should handle undefined result gracefully', () => {
      const result = sessionManager.handleEnhancedSessionCompletion(undefined, 'de', 'de');

      expect(result.isComplete).toBe(false);
    });
  });

  describe('handleWordProgression', () => {
    const mockSession = {
      id: 'quick-dash',
      name: 'Quick Dash',
      timeLimit: 5,
      targetWords: 15,
    };

    const mockWordProgress = {
      word1: { correct: 3, incorrect: 1, lastReviewed: Date.now() },
    };

    beforeEach(() => {
      (challengeServiceManager.isSessionTypeSupported as jest.Mock).mockReturnValue(true);
      (challengeServiceManager.getNextWord as jest.Mock).mockResolvedValue({
        word: {
          id: 'word2',
          term: 'Hallo',
          definition: 'Hello',
        },
        options: ['Hello', 'Goodbye', 'Please', 'Thanks'],
        quizMode: 'term-to-definition',
      });
    });

    it('should get next word from challenge service manager', async () => {
      await sessionManager.handleWordProgression(
        mockSession,
        60,
        { wordsCompleted: 5, currentStreak: 3 },
        mockWordProgress,
        'de',
        false
      );

      expect(challengeServiceManager.isSessionTypeSupported).toHaveBeenCalledWith('quick-dash');
      expect(challengeServiceManager.getNextWord).toHaveBeenCalled();

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'game/setCurrentWord',
        })
      );
    });

    it('should dispatch nextWord action for non-challenge sessions', async () => {
      (challengeServiceManager.isSessionTypeSupported as jest.Mock).mockReturnValue(false);

      await sessionManager.handleWordProgression(
        mockSession,
        60,
        { wordsCompleted: 5 },
        mockWordProgress,
        'de',
        false
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'game/nextWord',
        })
      );
    });

    it('should use nextWord fallback when isUsingSpacedRepetition is true', async () => {
      await sessionManager.handleWordProgression(
        mockSession,
        60,
        { wordsCompleted: 5 },
        mockWordProgress,
        'de',
        true
      );

      expect(challengeServiceManager.getNextWord).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'game/nextWord',
        })
      );
    });

    it('should handle errors when getting next word fails', async () => {
      (challengeServiceManager.getNextWord as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch word')
      );

      await sessionManager.handleWordProgression(
        mockSession,
        60,
        { wordsCompleted: 5 },
        mockWordProgress,
        'de',
        false
      );

      // Should fallback to nextWord
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'game/nextWord',
        })
      );
    });

    it('should handle null word result gracefully', async () => {
      (challengeServiceManager.getNextWord as jest.Mock).mockResolvedValue({
        word: null,
        options: [],
        quizMode: 'term-to-definition',
      });

      await sessionManager.handleWordProgression(
        mockSession,
        60,
        { wordsCompleted: 5 },
        mockWordProgress,
        'de',
        false
      );

      // Should not dispatch setCurrentWord for null word
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'game/setCurrentWord',
        })
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete quick-dash session flow', async () => {
      const session = {
        id: 'quick-dash',
        name: 'Quick Dash',
        timeLimit: 5,
      };

      // Answer 1: Correct
      await sessionManager.handleAnswerSubmission(
        true,
        session,
        true,
        30,
        { wordsCompleted: 0, currentStreak: 0 }
      );

      // Answer 2: Correct
      await sessionManager.handleAnswerSubmission(
        true,
        session,
        true,
        60,
        { wordsCompleted: 1, currentStreak: 1 }
      );

      // Answer 3: Incorrect
      await sessionManager.handleAnswerSubmission(
        false,
        session,
        true,
        90,
        { wordsCompleted: 2, currentStreak: 0 }
      );

      // Should have dispatched multiple times
      expect(mockDispatch).toHaveBeenCalledTimes(5); // 2 correct (increment + addCorrect) + 1 incorrect
    });

    it('should handle session completion after answers', async () => {
      const session = { id: 'precision-mode', name: 'Precision Mode' };

      // Submit final answer
      await sessionManager.handleAnswerSubmission(
        true,
        session,
        true,
        120,
        { wordsCompleted: 9, currentStreak: 5 }
      );

      // Complete session
      const completionResult = sessionManager.handleEnhancedSessionCompletion(
        { isComplete: true },
        'de'
      );

      expect(completionResult.isComplete).toBe(true);
      expect(completionResult.navigationPath).toBe('/completed/de');
    });
  });

  describe('Edge cases', () => {
    it('should handle negative time remaining gracefully', async () => {
      const session = {
        id: 'quick-dash',
        timeLimit: 5,
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        session,
        true,
        400, // More than 5 minutes
        { wordsCompleted: 1 }
      );

      expect(result.bonuses?.timeBonus).toBe(0);
    });

    it('should handle zero streak gracefully', async () => {
      const session = { id: 'streak-challenge' };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        session,
        true,
        0,
        { currentStreak: 0, wordsCompleted: 0 }
      );

      expect(result.bonuses?.streakBonus).toBe(0);
    });

    it('should handle session without id', async () => {
      const session = {
        name: 'Unknown Session',
      };

      const result = await sessionManager.handleAnswerSubmission(
        true,
        session,
        true,
        0,
        { wordsCompleted: 1 }
      );

      // Should not crash, bonuses should be zero
      expect(result.bonuses?.timeBonus).toBe(0);
      expect(result.bonuses?.streakBonus).toBe(0);
      expect(result.bonuses?.contextBonus).toBe(0);
    });
  });
});
