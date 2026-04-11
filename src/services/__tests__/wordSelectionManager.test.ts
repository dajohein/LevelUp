import { wordSelectionManager } from '../wordSelectionManager';
import { calculateMasteryDecay } from '../masteryService';

// Mock dependencies to provide simple test data
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
      id: 'module-word1',
      term: 'Tisch',
      definition: 'table',
      type: 'noun',
      german: 'Tisch',
      english: 'table',
    },
    {
      id: 'module-word2',
      term: 'Stuhl',
      definition: 'chair',
      type: 'noun',
      german: 'Stuhl',
      english: 'chair',
    },
  ]),
}));

jest.mock('../masteryService', () => ({
  // Returns the xp value (second argument) as the mastery score, matching the real call signature:
  // calculateMasteryDecay(lastPracticed: string | undefined, xp: number)
  calculateMasteryDecay: jest.fn((_lastPracticed: string | undefined, xp: number) =>
    Math.max(0, Math.min(100, xp || 0))
  ),
}));

describe('wordSelectionManager', () => {
  const manager = wordSelectionManager;

  describe('Singleton Pattern', () => {
    it('should be a singleton instance', () => {
      expect(manager).toBeDefined();
      expect(typeof manager.createSession).toBe('function');
    });
  });

  describe('Session Management', () => {
    it('should create a new session tracker', () => {
      const session = manager.createSession('test-session-1');

      expect(session).toBeDefined();
      expect(session.sessionId).toBe('test-session-1');
      expect(session.usedWordIds).toBeInstanceOf(Set);
      expect(session.recentlyUsedWords).toEqual([]);
      expect(session.maxRecentTracking).toBe(8);
    });

    it('should create session with custom max recent tracking', () => {
      const session = manager.createSession('test-session-2', 5);

      expect(session.maxRecentTracking).toBe(5);
    });

    it('should retrieve existing session', () => {
      manager.createSession('test-session-3');
      const retrieved = manager.getSession('test-session-3');

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe('test-session-3');
    });

    it('should return null for non-existent session', () => {
      const retrieved = manager.getSession('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should reset session', () => {
      const session = manager.createSession('test-session-4');
      manager.markWordAsUsed('test-session-4', 'word1');

      manager.resetSession('test-session-4');

      expect(session.usedWordIds.size).toBe(0);
      expect(session.recentlyUsedWords).toEqual([]);
    });
  });

  describe('Word Tracking', () => {
    it('should track used words in session', () => {
      const session = manager.createSession('tracking-session-1');

      manager.markWordAsUsed('tracking-session-1', 'word1');
      manager.markWordAsUsed('tracking-session-1', 'word2');

      expect(session.usedWordIds.has('word1')).toBe(true);
      expect(session.usedWordIds.has('word2')).toBe(true);
      expect(session.recentlyUsedWords).toContain('word1');
      expect(session.recentlyUsedWords).toContain('word2');
    });

    it('should maintain recent words limit', () => {
      const session = manager.createSession('tracking-session-2', 3);

      manager.markWordAsUsed('tracking-session-2', 'word1');
      manager.markWordAsUsed('tracking-session-2', 'word2');
      manager.markWordAsUsed('tracking-session-2', 'word3');
      manager.markWordAsUsed('tracking-session-2', 'word4');

      expect(session.recentlyUsedWords).toHaveLength(3);
      expect(session.recentlyUsedWords[0]).toBe('word4'); // Most recent first
    });

    it('should not duplicate words in used set', () => {
      const session = manager.createSession('tracking-session-3');

      manager.markWordAsUsed('tracking-session-3', 'word1');
      manager.markWordAsUsed('tracking-session-3', 'word1');
      manager.markWordAsUsed('tracking-session-3', 'word1');

      expect(session.usedWordIds.size).toBe(1);
    });

    it('should handle marking word in non-existent session gracefully', () => {
      expect(() => {
        manager.markWordAsUsed('non-existent', 'word1');
      }).not.toThrow();
    });
  });

  describe('API Methods', () => {
    it('should have all expected public methods', () => {
      expect(typeof manager.createSession).toBe('function');
      expect(typeof manager.getSession).toBe('function');
      expect(typeof manager.resetSession).toBe('function');
      expect(typeof manager.markWordAsUsed).toBe('function');
    });
  });

  describe('Session Lifecycle', () => {
    it('should track session start time', () => {
      const before = Date.now();
      const session = manager.createSession('time-test');
      const after = Date.now();

      expect(session.sessionStartTime).toBeGreaterThanOrEqual(before);
      expect(session.sessionStartTime).toBeLessThanOrEqual(after);
    });

    it('should update start time on reset', async () => {
      const session = manager.createSession('reset-time-test');
      const originalTime = session.sessionStartTime;

      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 10));

      manager.resetSession('reset-time-test');

      expect(session.sessionStartTime).toBeGreaterThan(originalTime);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Spaced Repetition Priority
  //
  // These tests guard against regressions where unlearned (never-practiced)
  // words beat words that are overdue for review.  The key invariant:
  //   overdue review word score  <  new word baseline (50)
  //
  // Scoring recap (lower score = higher priority):
  //   new word (no progress)           → 50  (early-return baseline)
  //   overdue word, 26h ago, xp=40     → 40 × 0.5 = 20
  //   recently-practiced word, xp=70   → 70  (no time reduction)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Spaced Repetition Priority', () => {
    // Suppress the masteryService mock warning – the module-level mock is
    // correct; these tests just verify selectWord picks the right word.
    beforeEach(() => {
      jest
        .mocked(calculateMasteryDecay)
        .mockImplementation((_lastPracticed: string | undefined, xp: number) =>
          Math.max(0, Math.min(100, xp || 0))
        );
    });

    it('should select an overdue review word before a new (never-practiced) word', () => {
      // word3 has been seen before and is overdue (practiced 26 h ago)
      // word1 and word2 have no progress at all → new words
      const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

      const wordProgress = {
        word3: {
          wordId: 'word3',
          xp: 40,
          lastPracticed: twentySixHoursAgo,
          timesCorrect: 4,
          timesIncorrect: 0,
        },
      };

      // Scores: word3 = 40 × 0.5 = 20 (overdue); word1/word2/word4/word5 = 50 (new)
      // word3 must be selected.
      manager.resetSession('sr-priority-overdue');
      const result = manager.selectWord(
        { languageCode: 'de' },
        wordProgress,
        'sr-priority-overdue'
      );

      expect(result).not.toBeNull();
      expect(result?.word.id).toBe('word3');
    });

    it('should select new words when no words are overdue for review', () => {
      // word1, word2, word3 all practiced within the last hour – not overdue.
      // word4 and word5 have never been practiced.
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

      const wordProgress = {
        word1: {
          wordId: 'word1',
          xp: 70,
          lastPracticed: oneHourAgo,
          timesCorrect: 5,
          timesIncorrect: 0,
        },
        word2: {
          wordId: 'word2',
          xp: 80,
          lastPracticed: oneHourAgo,
          timesCorrect: 6,
          timesIncorrect: 0,
        },
        word3: {
          wordId: 'word3',
          xp: 60,
          lastPracticed: oneHourAgo,
          timesCorrect: 4,
          timesIncorrect: 0,
        },
      };

      // Scores: word1=70, word2=80, word3=60 (all recent); word4/word5=50 (new)
      // A new word (50 < 60) should be selected.
      manager.resetSession('sr-priority-new');
      const result = manager.selectWord({ languageCode: 'de' }, wordProgress, 'sr-priority-new');

      expect(result).not.toBeNull();
      expect(['word4', 'word5']).toContain(result?.word.id);
    });

    it('should give highest priority to the most overdue and error-prone word', () => {
      // word3: overdue, error-prone  → very low score
      // word4: overdue, clean record → moderate score
      // word1, word2, word5: new    → baseline 50
      const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

      const wordProgress = {
        word3: {
          wordId: 'word3',
          xp: 20,
          lastPracticed: twentySixHoursAgo,
          timesCorrect: 3,
          timesIncorrect: 4, // errorRate ≈ 0.57 → triggers ×0.2 multiplier
        },
        word4: {
          wordId: 'word4',
          xp: 40,
          lastPracticed: twentySixHoursAgo,
          timesCorrect: 5,
          timesIncorrect: 0,
        },
      };

      // word3 score: 20 × 0.1 (struggling) × 0.2 (error-prone) × 0.5 (overdue) = 0.2
      // word4 score: 40 × 0.5 (overdue) = 20
      // new words: 50
      // word3 is the clear winner.
      manager.resetSession('sr-priority-struggling');
      const result = manager.selectWord(
        { languageCode: 'de', prioritizeStruggling: true },
        wordProgress,
        'sr-priority-struggling'
      );

      expect(result).not.toBeNull();
      expect(result?.word.id).toBe('word3');
    });
  });
});
