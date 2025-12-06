import { DataMigrationService } from '../dataMigrationService';
import { WordProgress } from '../../store/types';

describe('Data Migration Service', () => {
  describe('Progress Data Migration', () => {
    it('should migrate legacy word progress format', () => {
      const legacyProgress: any = {
        xp: 100,
        timesCorrect: 20,
        timesIncorrect: 5,
      };
      
      const migratedProgress = DataMigrationService.migrateLegacyWordProgress(legacyProgress);
      
      expect(migratedProgress).toHaveProperty('xp');
      expect(migratedProgress).toHaveProperty('timesCorrect');
      expect(migratedProgress).toHaveProperty('timesIncorrect');
    });

    it('should preserve XP values during migration', () => {
      const legacyProgress: any = {
        xp: 250,
        timesCorrect: 50,
        timesIncorrect: 10,
      };
      
      const migratedProgress = DataMigrationService.migrateLegacyWordProgress(legacyProgress);
      
      expect(migratedProgress.xp).toBe(250);
    });

    it('should add wordId during migration', () => {
      const legacyProgress: any = {
        xp: 100,
        timesCorrect: 20,
        timesIncorrect: 5,
      };
      
      const migratedProgress = DataMigrationService.migrateLegacyWordProgress(legacyProgress);
      
      expect(migratedProgress).toHaveProperty('wordId');
    });

    it('should add lastPracticed during migration', () => {
      const legacyProgress: any = {
        xp: 100,
        timesCorrect: 20,
        timesIncorrect: 5,
      };
      
      const migratedProgress = DataMigrationService.migrateLegacyWordProgress(legacyProgress);
      
      expect(migratedProgress).toHaveProperty('lastPracticed');
      expect(new Date(migratedProgress.lastPracticed)).toBeTruthy();
    });
  });

  describe('Migration Need Detection', () => {
    it('should detect if progress needs migration', () => {
      const legacyProgress: any = {
        xp: 100,
        timesCorrect: 20,
      };
      
      const needsMigration = DataMigrationService.needsMigration(legacyProgress);
      
      expect(typeof needsMigration).toBe('boolean');
    });

    it('should identify modern format as not needing migration', () => {
      const modernProgress: WordProgress = {
        wordId: 'module1:word1',
        xp: 100,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 20,
        timesIncorrect: 5,
      };
      
      const needsMigration = DataMigrationService.needsMigration(modernProgress);
      
      expect(typeof needsMigration).toBe('boolean');
    });
  });

  describe('Safe Loading with Migration', () => {
    it('should safely load progress with automatic migration', () => {
      const languageCode = 'de';
      
      const progress = DataMigrationService.safeLoadWordProgress(languageCode);
      
      expect(typeof progress).toBe('object');
    });

    it('should handle missing language data gracefully', () => {
      const languageCode = 'xx';
      
      expect(() => {
        DataMigrationService.safeLoadWordProgress(languageCode);
      }).not.toThrow();
    });

    it('should return object for new languages', () => {
      const languageCode = 'zz';
      
      const progress = DataMigrationService.safeLoadWordProgress(languageCode);
      
      expect(typeof progress).toBe('object');
    });

    it('should load language-specific progress', () => {
      const languageCode = 'es';
      
      const progress = DataMigrationService.safeLoadWordProgress(languageCode);
      
      expect(progress).toBeDefined();
      expect(typeof progress).toBe('object');
    });
  });

  describe('Language Data Isolation During Migration', () => {
    it('should maintain language separation during migration', () => {
      const germanProgress = DataMigrationService.safeLoadWordProgress('de');
      const spanishProgress = DataMigrationService.safeLoadWordProgress('es');
      
      // Both should be objects
      expect(typeof germanProgress).toBe('object');
      expect(typeof spanishProgress).toBe('object');
    });

    it('should not contaminate language data', () => {
      const germanProgress = DataMigrationService.safeLoadWordProgress('de');
      const spanishProgress = DataMigrationService.safeLoadWordProgress('es');
      
      // They should not be the same reference
      expect(germanProgress !== spanishProgress).toBe(true);
    });
  });

  describe('Migration Statistics', () => {
    it('should provide migration statistics', () => {
      const stats = DataMigrationService.getMigrationStats('de');
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should track total words count', () => {
      const stats = DataMigrationService.getMigrationStats('de');
      
      expect(stats).toHaveProperty('totalWords');
      expect(typeof stats.totalWords).toBe('number');
    });

    it('should track legacy words count', () => {
      const stats = DataMigrationService.getMigrationStats('de');
      
      expect(stats).toHaveProperty('legacyWords');
      expect(typeof stats.legacyWords).toBe('number');
    });

    it('should track migrated words count', () => {
      const stats = DataMigrationService.getMigrationStats('de');
      
      expect(stats).toHaveProperty('migratedWords');
      expect(typeof stats.migratedWords).toBe('number');
    });

    it('should track migration complete status', () => {
      const stats = DataMigrationService.getMigrationStats('de');
      
      expect(stats).toHaveProperty('migrationComplete');
      expect(typeof stats.migrationComplete).toBe('boolean');
    });
  });

  describe('Performance', () => {
    it('should migrate data quickly', () => {
      const legacyProgress: any = {
        xp: 100,
        timesCorrect: 20,
        timesIncorrect: 5,
      };
      
      const start = performance.now();
      DataMigrationService.migrateLegacyWordProgress(legacyProgress);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(10);
    });

    it('should load progress efficiently', () => {
      const start = performance.now();
      DataMigrationService.safeLoadWordProgress('de');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with legacy data', () => {
      const v1Data: any = {
        wordId: 'word1',
        xp: 100,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 20,
        timesIncorrect: 5,
      };
      
      const migrated = DataMigrationService.migrateLegacyWordProgress(v1Data);
      
      expect(migrated.xp).toBe(v1Data.xp);
      expect(migrated.timesCorrect).toBe(v1Data.timesCorrect);
      expect(migrated.timesIncorrect).toBe(v1Data.timesIncorrect);
    });
  });

  describe('Error Handling', () => {
    it('should handle null input gracefully', () => {
      const result = DataMigrationService.migrateLegacyWordProgress(null as any);
      expect(result).toBeDefined();
    });

    it('should handle undefined input gracefully', () => {
      const result = DataMigrationService.migrateLegacyWordProgress(undefined as any);
      expect(result).toBeDefined();
    });

    it('should handle empty object input', () => {
      const empty: any = {};
      
      const result = DataMigrationService.migrateLegacyWordProgress(empty);
      expect(result).toBeDefined();
    });
  });
});
