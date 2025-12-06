import { WordIdMigrationService } from '../wordIdMigrationService';

describe('WordIdMigrationService', () => {
  describe('createRobustWordId', () => {
    it('should create a robust word ID with module prefix', () => {
      const result = WordIdMigrationService.createRobustWordId('basic-nouns', '123');
      expect(result).toBe('basic-nouns:123');
    });

    it('should handle different module IDs', () => {
      const result = WordIdMigrationService.createRobustWordId('comida-y-bebidas', '456');
      expect(result).toBe('comida-y-bebidas:456');
    });

    it('should handle numeric word indices', () => {
      const result = WordIdMigrationService.createRobustWordId('verbs', '0');
      expect(result).toBe('verbs:0');
    });
  });

  describe('parseRobustWordId', () => {
    it('should parse a valid robust word ID', () => {
      const result = WordIdMigrationService.parseRobustWordId('basic-nouns:123');
      expect(result).toEqual({
        moduleId: 'basic-nouns',
        originalId: '123'
      });
    });

    it('should return null for simple numeric IDs', () => {
      const result = WordIdMigrationService.parseRobustWordId('123');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = WordIdMigrationService.parseRobustWordId('invalid-format');
      expect(result).toBeNull();
    });

    it('should handle zero word index', () => {
      const result = WordIdMigrationService.parseRobustWordId('verbs:0');
      expect(result).toEqual({
        moduleId: 'verbs',
        originalId: '0'
      });
    });
  });

  describe('needsIdMigration', () => {
    it('should identify IDs that need migration', () => {
      expect(WordIdMigrationService.needsIdMigration('123')).toBe(true);
      expect(WordIdMigrationService.needsIdMigration('456')).toBe(true);
    });

    it('should identify IDs that do not need migration', () => {
      expect(WordIdMigrationService.needsIdMigration('basic-nouns:123')).toBe(false);
      expect(WordIdMigrationService.needsIdMigration('comida-y-bebidas:456')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(WordIdMigrationService.needsIdMigration('')).toBe(true);
      expect(WordIdMigrationService.needsIdMigration('invalid')).toBe(true);
    });
  });

  describe('migration functionality', () => {
    it('should have migrateWordProgressIds method', () => {
      expect(typeof WordIdMigrationService.migrateWordProgressIds).toBe('function');
    });

    it('should have generateIdMigrationMap method', () => {
      expect(typeof WordIdMigrationService.generateIdMigrationMap).toBe('function');
    });

    it('should have clearMigrationCache method', () => {
      expect(typeof WordIdMigrationService.clearMigrationCache).toBe('function');
    });
  });
});
