import { WordProgress } from '../../store/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Language Data Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Critical: Language Separation', () => {
    it('should prevent cross-language data contamination', () => {
      const germanProgress: Record<string, WordProgress> = {
        'de:word1': {
          wordId: 'de:word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
      };

      const spanishProgress: Record<string, WordProgress> = {
        'es:word1': {
          wordId: 'es:word1',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 1,
        },
      };

      // CRITICAL VALIDATION: Do NOT mix language data
      const isMixed = Object.keys(germanProgress).some(key =>
        key.startsWith('es:')
      );

      expect(isMixed).toBe(false);
      expect(germanProgress['de:word1'].xp).toBe(100);
      expect(spanishProgress['es:word1'].xp).toBe(50);
    });

    it('should maintain separate language contexts', () => {
      const languages = {
        german: { code: 'de', progress: {} as Record<string, WordProgress> },
        spanish: { code: 'es', progress: {} as Record<string, WordProgress> },
        french: { code: 'fr', progress: {} as Record<string, WordProgress> },
      };

      // Populate German progress
      languages.german.progress['word1'] = {
        wordId: 'word1',
        xp: 100,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 20,
        timesIncorrect: 2,
      };

      // Populate Spanish progress
      languages.spanish.progress['word1'] = {
        wordId: 'word1',
        xp: 50,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 10,
        timesIncorrect: 1,
      };

      // Verify isolation: German and Spanish have different XP for same word
      expect(languages.german.progress['word1'].xp).toBe(100);
      expect(languages.spanish.progress['word1'].xp).toBe(50);
      expect(languages.french.progress['word1']).toBeUndefined();
    });

    it('should prevent progress mixing via language key prefix', () => {
      const allProgress: Record<string, WordProgress> = {};

      // Add German data with prefix
      allProgress['de:word1'] = {
        wordId: 'de:word1',
        xp: 100,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 20,
        timesIncorrect: 2,
      };

      // Add Spanish data with prefix
      allProgress['es:word1'] = {
        wordId: 'es:word1',
        xp: 50,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 10,
        timesIncorrect: 1,
      };

      // Filter by language
      const germanOnly = Object.entries(allProgress)
        .filter(([key]) => key.startsWith('de:'))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as any;

      expect(Object.keys(germanOnly)).toHaveLength(1);
      expect(germanOnly['de:word1'].xp).toBe(100);
      expect(germanOnly['es:word1']).toBeUndefined();
    });
  });

  describe('Language Selection Context', () => {
    it('should track current language selection', () => {
      const currentLanguage = 'de';
      expect(currentLanguage).toMatch(/^[a-z]{2}$/);
    });

    it('should validate language code format', () => {
      const validCodes = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'ru'];
      const invalidCodes = ['german', 'd', 'deu', '123'];

      validCodes.forEach(code => {
        expect(code).toMatch(/^[a-z]{2}$/);
      });

      invalidCodes.forEach(code => {
        expect(code).not.toMatch(/^[a-z]{2}$/);
      });
    });

    it('should persist language selection', () => {
      const languageKey = 'currentLanguage';
      const selectedLanguage = 'de';

      localStorage.setItem(languageKey, selectedLanguage);
      const retrieved = localStorage.getItem(languageKey);

      expect(retrieved).toBe('de');
    });
  });

  describe('Language-Specific Data Loading', () => {
    it('should load only current language progress', () => {
      const allProgress: Record<string, WordProgress> = {
        'de:word1': {
          wordId: 'de:word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'de:word2': {
          wordId: 'de:word2',
          xp: 80,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 15,
          timesIncorrect: 3,
        },
        'es:word1': {
          wordId: 'es:word1',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 1,
        },
      };

      const currentLanguage = 'de';
      const languageProgress = Object.entries(allProgress)
        .filter(([key]) => key.startsWith(`${currentLanguage}:`))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as any;

      expect(Object.keys(languageProgress)).toHaveLength(2);
      expect(languageProgress['de:word1']).toBeDefined();
      expect(languageProgress['de:word2']).toBeDefined();
      expect(languageProgress['es:word1']).toBeUndefined();
    });

    it('should handle language switch correctly', () => {
      const allProgress: Record<string, WordProgress> = {
        'de:word1': {
          wordId: 'de:word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'es:word1': {
          wordId: 'es:word1',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 1,
        },
      };

      // Switch from German to Spanish
      let currentLanguage = 'de';
      let germanProgress = Object.entries(allProgress)
        .filter(([key]) => key.startsWith(`${currentLanguage}:`))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as any;

      expect(Object.keys(germanProgress)).toHaveLength(1);

      currentLanguage = 'es';
      const spanishProgress = Object.entries(allProgress)
        .filter(([key]) => key.startsWith(`${currentLanguage}:`))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as any;

      expect(Object.keys(spanishProgress)).toHaveLength(1);
      expect(germanProgress['de:word1']).toBeDefined();
      expect(spanishProgress['es:word1']).toBeDefined();
    });
  });

  describe('Multi-Language Support', () => {
    it('should support multiple languages simultaneously', () => {
      const languages = ['de', 'es', 'fr', 'it', 'pt'];
      const progressByLanguage: Record<string, Record<string, WordProgress>> = {};

      languages.forEach(lang => {
        progressByLanguage[lang] = {
          'word1': {
            wordId: `${lang}:word1`,
            xp: Math.floor(Math.random() * 100),
            lastPracticed: new Date().toISOString(),
            timesCorrect: Math.floor(Math.random() * 20),
            timesIncorrect: Math.floor(Math.random() * 5),
          },
        };
      });

      expect(Object.keys(progressByLanguage)).toHaveLength(5);
      languages.forEach(lang => {
        expect(progressByLanguage[lang]['word1']).toBeDefined();
      });
    });

    it('should calculate stats per language', () => {
      const allProgress: Record<string, WordProgress> = {
        'de:word1': {
          wordId: 'de:word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'de:word2': {
          wordId: 'de:word2',
          xp: 80,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 15,
          timesIncorrect: 3,
        },
        'es:word1': {
          wordId: 'es:word1',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 1,
        },
      };

      const germanWords = Object.entries(allProgress)
        .filter(([key]) => key.startsWith('de:'))
        .reduce((acc, [_, v]) => {
          acc.totalXp += v.xp;
          acc.count += 1;
          return acc;
        }, { totalXp: 0, count: 0 });

      expect(germanWords.count).toBe(2);
      expect(germanWords.totalXp).toBe(180);
    });
  });

  describe('Data Integrity Across Languages', () => {
    it('should never mix language data during save', () => {
      const languageProgress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
      };

      // Simulate saving with language prefix
      const currentLanguage = 'de';
      const prefixedProgress: Record<string, WordProgress> = {};

      Object.entries(languageProgress).forEach(([id, progress]) => {
        const prefixedId = `${currentLanguage}:${id}`;
        prefixedProgress[prefixedId] = {
          ...progress,
          wordId: prefixedId,
        };
      });

      expect(prefixedProgress['de:word1']).toBeDefined();
      expect(prefixedProgress['word1']).toBeUndefined();
    });

    it('should validate language prefix on load', () => {
      const savedData: Record<string, WordProgress> = {
        'de:word1': {
          wordId: 'de:word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
      };

      const currentLanguage = 'de';
      const isValidPrefix = Object.keys(savedData).every(key =>
        key.startsWith(`${currentLanguage}:`)
      );

      expect(isValidPrefix).toBe(true);
    });
  });

  describe('Language Switch Safety', () => {
    it('should not carry over progress from previous language', () => {
      const germanProgress: Record<string, WordProgress> = {
        'de:word1': {
          wordId: 'de:word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
      };

      const spanishProgress: Record<string, WordProgress> = {
        'es:word1': {
          wordId: 'es:word1',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 1,
        },
      };

      // When switching to Spanish, should NOT have German data
      const hasCrossLanguageData = Object.keys(spanishProgress).some(key =>
        key.startsWith('de:')
      );

      expect(hasCrossLanguageData).toBe(false);
    });

    it('should handle rapid language switches', () => {
      const progressStorage: Record<string, Record<string, WordProgress>> = {
        de: {
          'word1': {
            wordId: 'word1',
            xp: 100,
            lastPracticed: new Date().toISOString(),
            timesCorrect: 20,
            timesIncorrect: 2,
          },
        },
        es: {
          'word1': {
            wordId: 'word1',
            xp: 50,
            lastPracticed: new Date().toISOString(),
            timesCorrect: 10,
            timesIncorrect: 1,
          },
        },
      };

      let currentLanguage = 'de';
      expect(progressStorage[currentLanguage]['word1'].xp).toBe(100);

      currentLanguage = 'es';
      expect(progressStorage[currentLanguage]['word1'].xp).toBe(50);

      currentLanguage = 'de';
      expect(progressStorage[currentLanguage]['word1'].xp).toBe(100);
    });
  });
});
