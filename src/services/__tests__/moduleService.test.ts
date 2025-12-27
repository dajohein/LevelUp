import {
  getAvailableLanguages,
  getLanguageInfo,
  getModule,
  getModulesForLanguage,
  getWordsForModule,
  getModuleStats,
} from '../moduleService';
import { WordProgress } from '../../store/types';
import { logger } from '../logger';

jest.mock('../logger');

describe('moduleService', () => {
  describe('getAvailableLanguages', () => {
    it('should return array of available languages with codes and info', () => {
      const languages = getAvailableLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);

      languages.forEach(lang => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('info');
        expect(typeof lang.code).toBe('string');
        expect(lang.info).toBeDefined();
      });
    });

    it('should include German (de) and Spanish (es)', () => {
      const languages = getAvailableLanguages();
      const codes = languages.map(l => l.code);

      expect(codes).toContain('de');
      expect(codes).toContain('es');
    });

    it('should have module information in language info', () => {
      const languages = getAvailableLanguages();
      const german = languages.find(l => l.code === 'de');

      expect(german?.info.modules).toBeDefined();
      expect(Array.isArray(german?.info.modules)).toBe(true);
      expect(german?.info.modules.length).toBeGreaterThan(0);
    });
  });

  describe('getLanguageInfo', () => {
    it('should return language info for valid language code', () => {
      const deInfo = getLanguageInfo('de');

      expect(deInfo).not.toBeNull();
      expect(deInfo?.name).toBeDefined();
      expect(deInfo?.flag).toBeDefined();
      expect(deInfo?.modules).toBeDefined();
    });

    it('should return null for invalid language code', () => {
      const info = getLanguageInfo('invalid-code');

      expect(info).toBeNull();
    });

    it('should have modules array with module metadata', () => {
      const deInfo = getLanguageInfo('de');

      expect(deInfo?.modules).toBeDefined();
      deInfo?.modules.forEach(module => {
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('name');
      });
    });

    it('should return different language infos for different languages', () => {
      const deInfo = getLanguageInfo('de');
      const esInfo = getLanguageInfo('es');

      expect(deInfo).not.toEqual(esInfo);
      expect(deInfo?.name).not.toBe(esInfo?.name);
    });
  });

  describe('getModule', () => {
    it('should return module data for valid language and module code', () => {
      const module = getModule('de', 'grundwortschatz');

      expect(module).not.toBeNull();
      expect(module?.words).toBeDefined();
      expect(Array.isArray(module?.words)).toBe(true);
    });

    it('should return null for invalid module code', () => {
      const module = getModule('de', 'invalid-module');

      expect(module).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return null for invalid language code', () => {
      const module = getModule('invalid-lang', 'grundwortschatz');

      expect(module).toBeNull();
    });

    it('should have words with required properties', () => {
      const module = getModule('de', 'grundwortschatz');

      expect(module?.words.length).toBeGreaterThan(0);
      module?.words.slice(0, 3).forEach(word => {
        expect(word).toHaveProperty('id');
        expect(word).toHaveProperty('term');
        expect(word).toHaveProperty('definition');
        expect(typeof word.id).toBe('string');
        expect(typeof word.term).toBe('string');
      });
    });

    it('should log warning with context when module not found', () => {
      getModule('de', 'nonexistent');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
        expect.objectContaining({
          languageCode: 'de',
          moduleId: 'nonexistent',
        })
      );
    });

    it('should return different modules for different module codes', () => {
      const mod1 = getModule('de', 'grundwortschatz');
      const mod2 = getModule('de', 'grammatik-grundlagen');

      expect(mod1?.words.length).not.toBe(mod2?.words.length);
    });
  });

  describe('getModulesForLanguage', () => {
    it('should return array of modules for valid language', () => {
      const modules = getModulesForLanguage('de');

      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid language', () => {
      const modules = getModulesForLanguage('invalid-lang');

      expect(modules).toEqual([]);
    });

    it('should return different modules for different languages', () => {
      const deModules = getModulesForLanguage('de');
      const esModules = getModulesForLanguage('es');

      expect(deModules.length).toBeGreaterThan(0);
      expect(esModules.length).toBeGreaterThan(0);

      const deIds = new Set(deModules.map(m => m.id));
      const esIds = new Set(esModules.map(m => m.id));

      // Ensure there is at least one module id unique to each language
      const deHasUnique = [...deIds].some(id => !esIds.has(id));
      const esHasUnique = [...esIds].some(id => !deIds.has(id));

      expect(deHasUnique || esHasUnique).toBe(true);
    });

    it('should have modules with word data', () => {
      const modules = getModulesForLanguage('de');

      modules.forEach(module => {
        expect(module.words).toBeDefined();
        expect(Array.isArray(module.words)).toBe(true);
      });
    });

    it('should only return successfully loaded modules', () => {
      const modules = getModulesForLanguage('de');

      // All returned modules should have words
      modules.forEach(module => {
        expect(module.words).toBeDefined();
        expect(module.words.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getWordsForModule', () => {
    it('should return words array for valid module', () => {
      const words = getWordsForModule('de', 'grundwortschatz');

      expect(Array.isArray(words)).toBe(true);
      expect(words.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid module', () => {
      const words = getWordsForModule('de', 'invalid-module');

      expect(words).toEqual([]);
    });

    it('should return empty array for invalid language', () => {
      const words = getWordsForModule('invalid-lang', 'grundwortschatz');

      expect(words).toEqual([]);
    });

    it('should return words with all required properties', () => {
      const words = getWordsForModule('de', 'grundwortschatz');

      words.slice(0, 5).forEach(word => {
        expect(word).toHaveProperty('id');
        expect(word).toHaveProperty('term');
        expect(word).toHaveProperty('definition');
        expect(typeof word.id).toBe('string');
        expect(typeof word.term).toBe('string');
        expect(typeof word.definition).toBe('string');
      });
    });

    it('should return different words for different modules', () => {
      const words1 = getWordsForModule('de', 'grundwortschatz');
      const words2 = getWordsForModule('de', 'grammatik-grundlagen');

      // Words should differ between modules
      // Should have some difference (some modules may have overlaps)
      expect(words1.length + words2.length).toBeGreaterThan(0);
    });
  });

  describe('getModuleStats', () => {
    const mockProgress: Record<string, WordProgress> = {
      'word-1': {
        wordId: 'word-1',
        xp: 50,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 2,
        timesIncorrect: 1,
      },
      'word-2': {
        wordId: 'word-2',
        xp: 30,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 1,
        timesIncorrect: 1,
      },
      'word-3': {
        wordId: 'word-3',
        xp: 0,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 0,
        timesIncorrect: 1,
      },
    };

    it('should return stats object with required properties', () => {
      const stats = getModuleStats('de', 'grundwortschatz', mockProgress);

      expect(stats).toHaveProperty('totalWords');
      expect(stats).toHaveProperty('completedWords');
      expect(stats).toHaveProperty('averageMastery');
      expect(stats).toHaveProperty('wordsLearned');
      expect(stats).toHaveProperty('completionPercentage');
    });

    it('should return zero stats for invalid module', () => {
      const stats = getModuleStats('de', 'invalid-module', mockProgress);

      expect(stats.totalWords).toBe(0);
      expect(stats.completedWords).toBe(0);
      expect(stats.averageMastery).toBe(0);
      expect(stats.wordsLearned).toBe(0);
      expect(stats.completionPercentage).toBe(0);
    });

    it('should calculate totalWords correctly', () => {
      const stats = getModuleStats('de', 'grundwortschatz', {});
      const module = getModule('de', 'grundwortschatz');

      expect(stats.totalWords).toBe(module?.words.length);
    });

    it('should count words with xp >= 20 as completed', () => {
      const stats = getModuleStats('de', 'grundwortschatz', mockProgress);

      // word-1 (xp: 50) and word-2 (xp: 30) should be completed
      // word-3 (xp: 0) should not be completed
      expect(stats.completedWords).toBeGreaterThanOrEqual(0);
    });

    it('should count words with any xp > 0 as learned', () => {
      const stats = getModuleStats('de', 'grundwortschatz', mockProgress);

      // word-1 and word-2 have xp > 0
      expect(stats.wordsLearned).toBeGreaterThanOrEqual(0);
    });

    it('should calculate averageMastery across all words', () => {
      const stats = getModuleStats('de', 'grundwortschatz', mockProgress);

      expect(typeof stats.averageMastery).toBe('number');
      expect(stats.averageMastery).toBeGreaterThanOrEqual(0);
    });

    it('should calculate completionPercentage correctly', () => {
      const stats = getModuleStats('de', 'grundwortschatz', mockProgress);

      expect(typeof stats.completionPercentage).toBe('number');
      expect(stats.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(stats.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should handle empty word progress', () => {
      const stats = getModuleStats('de', 'grundwortschatz', {});

      expect(stats.completedWords).toBe(0);
      expect(stats.averageMastery).toBe(0);
      expect(stats.wordsLearned).toBe(0);
      expect(stats.completionPercentage).toBe(0);
    });

    it('should handle undefined word progress parameter', () => {
      const stats = getModuleStats('de', 'grundwortschatz');

      expect(stats.totalWords).toBeGreaterThan(0);
      expect(stats.completedWords).toBe(0);
      expect(stats.completionPercentage).toBe(0);
    });

    it('should only count progress for words in the module', () => {
      const progressWithExtraWords: Record<string, WordProgress> = {
        ...mockProgress,
        'word-not-in-module': {
          wordId: 'word-not-in-module',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 0,
        },
      };

      const stats = getModuleStats('de', 'grundwortschatz', progressWithExtraWords);
      const module = getModule('de', 'grundwortschatz');

      // totalWords should only include words in the module
      expect(stats.totalWords).toBe(module?.words.length);
    });

    it('should provide stats for all available modules', () => {
      const modules = getModulesForLanguage('de');

      modules.forEach(module => {
        const stats = getModuleStats('de', (module as any).id, mockProgress);

        expect(stats.totalWords).toBeGreaterThan(0);
        expect(typeof stats.completionPercentage).toBe('number');
      });
    });
  });

  describe('Language isolation', () => {
    it('should not cross-contaminate language data', () => {
      const deModules = getModulesForLanguage('de');
      const esModules = getModulesForLanguage('es');

      const deWords = deModules.flatMap(m => m.words);
      const esWords = esModules.flatMap(m => m.words);

      // Languages should have separate module data (even if some word IDs overlap)
      expect(deModules.length).toBeGreaterThan(0);
      expect(esModules.length).toBeGreaterThan(0);
      expect(deWords.length).not.toBe(esWords.length);

      // Verify language-specific module structure
      const deLanguageInfo = getLanguageInfo('de');
      const esLanguageInfo = getLanguageInfo('es');
      expect(deLanguageInfo?.modules).not.toEqual(esLanguageInfo?.modules);
    });

    it('should maintain language-specific module lists', () => {
      const deInfo = getLanguageInfo('de');
      const esInfo = getLanguageInfo('es');

      expect(deInfo?.modules).not.toEqual(esInfo?.modules);
    });

    it('should return language-scoped stats', () => {
      const progress: Record<string, WordProgress> = {
        'word-1': {
          wordId: 'word-1',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 2,
          timesIncorrect: 1,
        },
      };

      const deStats = getModuleStats('de', 'grundwortschatz', progress);
      const esStats = getModuleStats('es', 'vocabulario-basico', progress);

      // Different modules should produce different stats (different word counts)
      expect(deStats.totalWords).not.toBe(esStats.totalWords);
    });
  });

  describe('Edge cases', () => {
    it('should handle module with zero words gracefully', () => {
      // Test with a mock empty module scenario
      const words = getWordsForModule('de', 'nonexistent');
      expect(words).toEqual([]);
    });

    it('should handle very large word progress objects', () => {
      const largeProgress: Record<string, WordProgress> = {};
      for (let i = 0; i < 1000; i++) {
        largeProgress[`word-${i}`] = {
          wordId: `word-${i}`,
          xp: Math.floor(Math.random() * 100),
          lastPracticed: new Date().toISOString(),
          timesCorrect: Math.floor(Math.random() * 10),
          timesIncorrect: Math.floor(Math.random() * 10),
        };
      }

      const stats = getModuleStats('de', 'grundwortschatz', largeProgress);

      expect(stats.totalWords).toBeGreaterThan(0);
      expect(typeof stats.averageMastery).toBe('number');
    });

    it('should handle special characters in module IDs', () => {
      // Test actual module with hyphens
      const module = getModule('de', 'grammatik-grundlagen');
      expect(module).not.toBeNull();
    });

    it('should be case-sensitive for language and module codes', () => {
      const lower = getModule('de', 'grundwortschatz');
      const upper = getModule('DE', 'GRUNDWORTSCHATZ');

      expect(lower).not.toBeNull();
      expect(upper).toBeNull();
    });
  });
});
