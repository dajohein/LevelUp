import { WordSelectionManager } from '../wordSelectionManager';

// Mock dependencies to provide simple test data
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
    { id: 'module-word1', term: 'Tisch', definition: 'table', type: 'noun', german: 'Tisch', english: 'table' },
    { id: 'module-word2', term: 'Stuhl', definition: 'chair', type: 'noun', german: 'Stuhl', english: 'chair' },
  ]),
}));

jest.mock('../masteryService', () => ({
  calculateMasteryDecay: jest.fn((progress) => {
    const score = progress?.xp || 0;
    return Math.max(0, Math.min(100, score));
  }),
}));

describe('WordSelectionManager', () => {
  let manager: WordSelectionManager;

  beforeEach(() => {
    manager = WordSelectionManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WordSelectionManager.getInstance();
      const instance2 = WordSelectionManager.getInstance();

      expect(instance1).toBe(instance2);
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
});
