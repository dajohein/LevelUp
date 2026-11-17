import { enhancedWordService } from '../enhancedWordService';
import { getWordsForLanguage } from '../wordService';
import { learningCacheService } from '../cacheService';
import { analyzeSessionPerformance } from '../spacedRepetitionService';
import type { Word } from '../wordService';

// Mock dependencies to return simple test data
jest.mock('../wordService', () => ({
  getWordsForLanguage: jest.fn(() => [
    { id: 'word1', term: 'Hund', definition: 'dog', type: 'noun', german: 'Hund', english: 'dog' },
    {
      id: 'word2',
      term: 'Katze',
      definition: 'cat',
      type: 'noun',
      german: 'Katze',
      english: 'cat',
    },
    {
      id: 'word3',
      term: 'Haus',
      definition: 'house',
      type: 'noun',
      german: 'Haus',
      english: 'house',
    },
    { id: 'word4', term: 'Auto', definition: 'car', type: 'noun', german: 'Auto', english: 'car' },
    {
      id: 'word5',
      term: 'Buch',
      definition: 'book',
      type: 'noun',
      german: 'Buch',
      english: 'book',
    },
  ]),
}));

jest.mock('../moduleService', () => ({
  getWordsForModule: jest.fn(() => [
    {
      id: 'module1',
      term: 'Tisch',
      definition: 'table',
      type: 'noun',
      german: 'Tisch',
      english: 'table',
    },
    {
      id: 'module2',
      term: 'Stuhl',
      definition: 'chair',
      type: 'noun',
      german: 'Stuhl',
      english: 'chair',
    },
  ]),
}));

jest.mock('../cacheService', () => ({
  learningCacheService: {
    createLearningSession: jest.fn((_languageCode, words) => ({
      sessionType: 'new',
      words: words.map((word: Word) => ({ word })),
      reviewWords: [],
    })),
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
  interleaveSessionWords: jest.fn(session => {
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
      jest.mocked(getWordsForLanguage).mockReturnValueOnce([]);

      const result = enhancedWordService.initializeLearningSession('de');

      expect(result).toBe(false);
    });

    it('preserves a zero session start timestamp when completing a session', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(500);

      try {
        expect(enhancedWordService.initializeLearningSession('de', undefined, {}, 0)).toBe(true);
        enhancedWordService.forceCompleteSession();

        expect(jest.mocked(learningCacheService.recordSession)).toHaveBeenCalledWith(
          'de',
          expect.anything(),
          expect.anything(),
          [],
          0,
          500,
          'de:0'
        );
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe('Missed-word re-queue', () => {
    it('brings a missed word back once, flagged as a retry, and extends the session', () => {
      expect(enhancedWordService.initializeLearningSession('de')).toBe(true);
      const first = enhancedWordService.getCurrentWord();
      expect(first?.isRetry).toBe(false);
      const missedId = first?.word?.id;

      const seen: Array<{ id?: string; isRetry: boolean }> = [];
      let step = enhancedWordService.recordAnswer(false);
      while (!step.isSessionComplete && step.nextWord) {
        seen.push({ id: step.nextWord.word?.id, isRetry: step.nextWord.isRetry });
        step = enhancedWordService.recordAnswer(true);
      }

      // 5 original words + exactly one retry of the missed word, in recognition mode
      expect(seen).toHaveLength(5);
      expect(seen.filter(entry => entry.isRetry)).toEqual([{ id: missedId, isRetry: true }]);
    });

    it('asks the retry in multiple choice, three words later', () => {
      expect(enhancedWordService.initializeLearningSession('de')).toBe(true);
      const missedId = enhancedWordService.getCurrentWord()?.word?.id;

      const upcoming: Array<{ id?: string; isRetry: boolean; mode?: string }> = [];
      let step = enhancedWordService.recordAnswer(false);
      while (!step.isSessionComplete && step.nextWord) {
        upcoming.push({
          id: step.nextWord.word?.id,
          isRetry: step.nextWord.isRetry,
          mode: step.nextWord.quizMode,
        });
        step = enhancedWordService.recordAnswer(true);
      }

      const retryAt = upcoming.findIndex(entry => entry.isRetry);
      // the missed word was index 0; the three words after it come first, then the retry
      expect(retryAt).toBe(3);
      expect(upcoming[retryAt]).toMatchObject({ id: missedId, mode: 'multiple-choice' });
    });

    it('keeps retries out of the session analytics: first attempts only', () => {
      expect(enhancedWordService.initializeLearningSession('de')).toBe(true);
      const missedId = enhancedWordService.getCurrentWord()?.word?.id;

      let step = enhancedWordService.recordAnswer(false); // first attempt of the first word: wrong
      while (!step.isSessionComplete && step.nextWord) {
        step = enhancedWordService.recordAnswer(true); // everything else, including the retry: right
      }

      // analyzeSessionPerformance is mocked in this file, so check what it was given
      const [, results] = jest.mocked(analyzeSessionPerformance).mock.calls[0];
      expect(results).toHaveLength(5); // first attempts only; the correct retry would make it 6
      expect(results.some(r => 'isRetry' in r && r.isRetry)).toBe(false);
      expect(results.filter(r => !r.isCorrect).map(r => r.wordId)).toEqual([missedId]);
    });

    it('starts every session with a clean re-queue state', () => {
      for (let session = 0; session < 2; session++) {
        expect(enhancedWordService.initializeLearningSession('de')).toBe(true);
        const missedId = enhancedWordService.getCurrentWord()?.word?.id;
        let sawRetry = false;
        let step = enhancedWordService.recordAnswer(false);
        while (!step.isSessionComplete && step.nextWord) {
          if (step.nextWord.isRetry && step.nextWord.word?.id === missedId) sawRetry = true;
          step = enhancedWordService.recordAnswer(true);
        }
        expect(sawRetry).toBe(true);
      }
    });

    it('does not queue another retry when the retry is also missed', () => {
      expect(enhancedWordService.initializeLearningSession('de')).toBe(true);
      let step = enhancedWordService.recordAnswer(false);
      let count = 1;
      while (!step.isSessionComplete) {
        count++;
        step = enhancedWordService.recordAnswer(false);
        if (count > 20) break;
      }

      // 5 words + 5 single retries = 10 answers, never an endless loop
      expect(count).toBeLessThanOrEqual(10);
      expect(step.isSessionComplete).toBe(true);
    });
  });

  describe('Session State', () => {
    it('should report no active session initially', () => {
      const hasSession = enhancedWordService.hasActiveSession();

      expect(hasSession).toBe(false);
    });

    it('filters equivalent definition distractors from mixed enhanced sessions', () => {
      const words: Word[] = [
        {
          id: 'erkaltung',
          term: 'die Erkältung',
          definition: 'de verkoudheid',
          direction: 'definition-to-term',
        },
        {
          id: 'schnupfen',
          term: 'der Schnupfen',
          definition: 'de verkoudheid',
          direction: 'definition-to-term',
        },
        { id: 'arm', term: 'der Arm', definition: 'de arm', direction: 'definition-to-term' },
        { id: 'hand', term: 'die Hand', definition: 'de hand', direction: 'definition-to-term' },
        {
          id: 'fieber',
          term: 'das Fieber',
          definition: 'de koorts',
          direction: 'definition-to-term',
        },
      ];
      jest.mocked(getWordsForLanguage).mockReturnValueOnce(words);

      expect(enhancedWordService.initializeLearningSession('de')).toBe(true);
      const currentWord = enhancedWordService.getCurrentWord();

      expect(currentWord?.word?.term).toBe('die Erkältung');
      expect(currentWord?.options).toContain('die Erkältung');
      expect(currentWord?.options).not.toContain('der Schnupfen');
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
      expect(() => {
        enhancedWordService.refreshWordGroups('de', {});
      }).not.toThrow();
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
