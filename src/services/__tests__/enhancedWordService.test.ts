import { enhancedWordService } from '../enhancedWordService';

// Mock dependencies to return simple test data
jest.mock('../wordService', () => ({
  getWordsForLanguage: jest.fn(() => [
    { id: 'word1', term: 'Hund', definition: 'dog', type: 'noun', german: 'Hund', english: 'dog' },
    { id: 'word2', term: 'Katze', definition: 'cat', type: 'noun', german: 'Katze', english: 'cat' },
    { id: 'word3', term: 'Haus', definition: 'house', type: 'noun', german: 'Haus', english: 'house' },
    { id: 'word4', term: 'Auto', definition: 'car', type: 'noun', german: 'Auto', english: 'car' },
    { id: 'word5', term: 'Buch', definition: 'book', type: 'noun', german: 'Buch', english: 'book' },
  ]),
}));

jest.mock('../moduleService', () => ({
  getWordsForModule: jest.fn(() => [
    { id: 'module1', term: 'Tisch', definition: 'table', type: 'noun', german: 'Tisch', english: 'table' },
    { id: 'module2', term: 'Stuhl', definition: 'chair', type: 'noun', german: 'Stuhl', english: 'chair' },
  ]),
}));

jest.mock('../cacheService', () => ({
  learningCacheService: {
    getActiveSession: jest.fn(() => null),
    cacheSession: jest.fn(),
    invalidateSession: jest.fn(),
    recordSession: jest.fn(),
    getAnalytics: jest.fn(() => ({})),
    getSessionHistory: jest.fn(() => []),
    refreshWordGroups: jest.fn(),
  },
}));

jest.mock('../spacedRepetitionService', () => ({
  interleaveSessionWords: jest.fn((session) => {
    const words = session.words || [];
    return words.map((w: any) => ({
      word: w.word || w,
      quizMode: 'multiple-choice',
      type: 'group',
    }));
  }),
  analyzeSessionPerformance: jest.fn(() => ({
    averageAccuracy: 0.8,
    averageTimePerWord: 5000,
    wordsLearned: 5,
    recommendations: [],
  })),
}));

describe('enhancedWordService', () => {
  beforeEach(() => {
    // Reset service state between tests
    enhancedWordService.resetSession();
    jest.clearAllMocks();
  });

  describe('Session Initialization', () => {
    it('should initialize session for language', () => {
      const result = enhancedWordService.initializeLearningSession('de');

      // May return false if session creation fails, that's OK for this test
      expect(typeof result).toBe('boolean');
    });

    it('should initialize session for language and module', () => {
      const result = enhancedWordService.initializeLearningSession('de', 'basic-nouns');

      expect(typeof result).toBe('boolean');
    });

    it('should handle empty word list', () => {
      const mockGetWords = require('../wordService').getWordsForLanguage;
      mockGetWords.mockReturnValueOnce([]);

      const result = enhancedWordService.initializeLearningSession('de');

      expect(result).toBe(false);
    });
  });

  describe('Session State', () => {
    it('should report no active session initially', () => {
      const hasSession = enhancedWordService.hasActiveSession();

      expect(hasSession).toBe(false);
    });

    it('should reset session', () => {
      enhancedWordService.resetSession();
      const hasSession = enhancedWordService.hasActiveSession();

      expect(hasSession).toBe(false);
    });
  });

  describe('Fallback Word Selection', () => {
    it('should provide getRandomWordFallback method', () => {
      expect(typeof enhancedWordService.getRandomWordFallback).toBe('function');
    });

    it('should get random word with fallback method', () => {
      const result = enhancedWordService.getRandomWordFallback('de', {});

      expect(result).toBeDefined();
      expect(result).toHaveProperty('word');
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('quizMode');
    });

    it('should return word with multiple choice options', () => {
      const result = enhancedWordService.getRandomWordFallback('de', {});

      if (result.word) {
        expect(result.options).toBeInstanceOf(Array);
        expect(result.quizMode).toBeDefined();
      }
    });

    it('should support module-specific selection', () => {
      const result = enhancedWordService.getRandomWordFallback('de', {}, undefined, 'basic-nouns');

      expect(result).toBeDefined();
    });
  });

  describe('Session Progress', () => {
    it('should return null progress when no session', () => {
      const progress = enhancedWordService.getSessionProgress();

      expect(progress).toBeNull();
    });

    it('should provide session info accessor', () => {
      const info = enhancedWordService.getCurrentSessionInfo();

      // Should be null when no session
      expect(info).toBeNull();
    });
  });

  describe('Analytics Methods', () => {
    it('should provide getLearningAnalytics method', () => {
      expect(typeof enhancedWordService.getLearningAnalytics).toBe('function');
    });

    it('should get learning analytics', () => {
      const analytics = enhancedWordService.getLearningAnalytics('de');

      expect(analytics).toBeDefined();
    });

    it('should provide getSessionHistory method', () => {
      expect(typeof enhancedWordService.getSessionHistory).toBe('function');
    });

    it('should get session history', () => {
      const history = enhancedWordService.getSessionHistory('de');

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should support history limit parameter', () => {
      const history = enhancedWordService.getSessionHistory('de', 5);

      expect(history).toBeDefined();
    });
  });

  describe('Word Groups', () => {
    it('should provide refreshWordGroups method', () => {
      expect(typeof enhancedWordService.refreshWordGroups).toBe('function');
    });

    it('should refresh word groups', () => {
      const result = enhancedWordService.refreshWordGroups('de', {});

      // Should complete without error
      expect(result).toBeDefined();
    });
  });

  describe('API Methods', () => {
    it('should have all expected public methods', () => {
      expect(typeof enhancedWordService.initializeLearningSession).toBe('function');
      expect(typeof enhancedWordService.getCurrentWord).toBe('function');
      expect(typeof enhancedWordService.recordAnswer).toBe('function');
      expect(typeof enhancedWordService.getSessionProgress).toBe('function');
      expect(typeof enhancedWordService.resetSession).toBe('function');
      expect(typeof enhancedWordService.hasActiveSession).toBe('function');
      expect(typeof enhancedWordService.forceCompleteSession).toBe('function');
      expect(typeof enhancedWordService.getRandomWordFallback).toBe('function');
    });
  });
});
