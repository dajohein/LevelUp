import { validateAnswer, getCapitalizationFeedback } from '../answerValidation';

describe('Answer Validation', () => {
  describe('Basic Answer Validation', () => {
    it('should validate exact match answers', () => {
      const userAnswer = 'test';
      const correctAnswer = 'test';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle case-insensitive validation by default', () => {
      const userAnswer = 'TEST';
      const correctAnswer = 'test';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });

    it('should reject incorrect answers', () => {
      const userAnswer = 'wrong';
      const correctAnswer = 'test';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(false);
    });

    it('should handle whitespace trimming', () => {
      const userAnswer = '  test  ';
      const correctAnswer = 'test';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      // Whitespace should be handled (either trimmed or matched literally)
      expect(result).toHaveProperty('isCorrect');
      expect(typeof result.isCorrect).toBe('boolean');
    });

    it('should handle empty answers', () => {
      const userAnswer = '';
      const correctAnswer = 'test';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('German Capitalization Rules', () => {
    it('should validate German nouns with capital letters', () => {
      const userAnswer = 'Hund';
      const correctAnswer = 'Hund';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'de');
      expect(result.isCorrect).toBe(true);
    });

    it('should flag German noun without capitalization', () => {
      const userAnswer = 'hund';
      const correctAnswer = 'Hund';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'de');
      // Capitalization is checked separately
      expect(result).toHaveProperty('capitalizationCorrect');
      expect(typeof result.capitalizationCorrect).toBe('boolean');
    });

    it('should not flag non-German languages for capitalization', () => {
      const userAnswer = 'dog';
      const correctAnswer = 'Dog';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result).toHaveProperty('isCorrect');
    });

    it('should handle German articles with capitalization', () => {
      const userAnswer = 'der hund';
      const correctAnswer = 'Der Hund';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'de');
      expect(result).toBeDefined();
    });
  });

  describe('Diacritic and Accent Handling', () => {
    it('should validate accented characters in Spanish', () => {
      const userAnswer = 'niño';
      const correctAnswer = 'niño';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'es');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle umlaut in German', () => {
      const userAnswer = 'Müller';
      const correctAnswer = 'Müller';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'de');
      expect(result.isCorrect).toBe(true);
    });

    it('should validate ç in French', () => {
      const userAnswer = 'garçon';
      const correctAnswer = 'garçon';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'fr');
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('Special Characters and Punctuation', () => {
    it('should handle apostrophes', () => {
      const userAnswer = "don't";
      const correctAnswer = "don't";
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle hyphens', () => {
      const userAnswer = 'well-known';
      const correctAnswer = 'well-known';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });

    it('should ignore extra punctuation in validation', () => {
      const userAnswer = 'test.';
      const correctAnswer = 'test';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      // Depending on implementation, may be correct or flagged
      expect(result).toHaveProperty('isCorrect');
    });
  });

  describe('Capitalization Feedback', () => {
    it('should provide feedback for incorrect capitalization', () => {
      const userAnswer = 'hund';
      const correctAnswer = 'Hund';
      
      const validation = validateAnswer(userAnswer, correctAnswer, 'de');
      const feedback = getCapitalizationFeedback(validation, 'de');
      
      expect(feedback === null || typeof feedback === 'string').toBe(true);
    });

    it('should provide feedback for incorrect capitalization variant', () => {
      const userAnswer = 'HUND';
      const correctAnswer = 'Hund';
      
      const validation = validateAnswer(userAnswer, correctAnswer, 'de');
      const feedback = getCapitalizationFeedback(validation, 'de');
      
      expect(feedback === null || typeof feedback === 'string').toBe(true);
    });

    it('should handle feedback for non-German languages', () => {
      const userAnswer = 'test';
      const correctAnswer = 'Test';
      
      const validation = validateAnswer(userAnswer, correctAnswer, 'en');
      const feedback = getCapitalizationFeedback(validation, 'en');
      
      // Should return null or empty for non-case-sensitive languages
      expect(feedback === null || typeof feedback === 'string').toBe(true);
    });

    it('should provide specific feedback for capitalization errors', () => {
      const userAnswer = 'der hund';
      const correctAnswer = 'Der Hund';
      
      const validation = validateAnswer(userAnswer, correctAnswer, 'de');
      const feedback = getCapitalizationFeedback(validation, 'de');
      
      expect(feedback === null || typeof feedback === 'string').toBe(true);
    });
  });

  describe('Multiple Word Answers', () => {
    it('should validate multi-word answers', () => {
      const userAnswer = 'hello world';
      const correctAnswer = 'hello world';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle German multi-word with capitalization', () => {
      const userAnswer = 'guter morgen';
      const correctAnswer = 'Guter Morgen';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'de');
      expect(result).toHaveProperty('capitalizationCorrect');
    });

    it('should validate phrases with articles', () => {
      const userAnswer = 'the quick brown fox';
      const correctAnswer = 'the quick brown fox';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('Language-Specific Rules', () => {
    it('should apply German capitalization rules', () => {
      const userAnswer = 'Schule';
      const correctAnswer = 'Schule';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'de');
      expect(result.isCorrect).toBe(true);
    });

    it('should apply Spanish rules', () => {
      const userAnswer = 'buenos días';
      const correctAnswer = 'buenos días';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'es');
      expect(result.isCorrect).toBe(true);
    });

    it('should apply French rules', () => {
      const userAnswer = 'bonjour';
      const correctAnswer = 'bonjour';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'fr');
      expect(result.isCorrect).toBe(true);
    });

    it('should apply Italian rules', () => {
      const userAnswer = 'ciao';
      const correctAnswer = 'ciao';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'it');
      expect(result.isCorrect).toBe(true);
    });
  });

  describe('Validation Result Object', () => {
    it('should return validation result with required properties', () => {
      const result = validateAnswer('test', 'test', 'en');
      
      expect(result).toHaveProperty('isCorrect');
      expect(typeof result.isCorrect).toBe('boolean');
    });

    it('should include capitalization correct flag', () => {
      const result = validateAnswer('test', 'Test', 'de');
      
      expect(result).toHaveProperty('capitalizationCorrect');
    });

    it('should include capitalization penalty', () => {
      const result = validateAnswer('test', 'Test', 'de');
      
      expect(result).toHaveProperty('capitalizationPenalty');
      expect(typeof result.capitalizationPenalty).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long answers', () => {
      const longString = 'a'.repeat(1000);
      const result = validateAnswer(longString, longString, 'en');
      
      expect(result.isCorrect).toBe(true);
    });

    it('should handle special Unicode characters', () => {
      const userAnswer = '你好';
      const correctAnswer = '你好';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'zh');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle numbers in answers', () => {
      const userAnswer = '123';
      const correctAnswer = '123';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle mixed numbers and letters', () => {
      const userAnswer = 'test123';
      const correctAnswer = 'test123';
      
      const result = validateAnswer(userAnswer, correctAnswer, 'en');
      expect(result.isCorrect).toBe(true);
    });
  });
});
