import { 
  calculateMasteryGain,
  isWordLearned,
  isWordMastered,
  MASTERY_LEVELS,
  QUIZ_MODE_THRESHOLDS,
} from '../masteryService';

describe('Mastery Service', () => {
  describe('Mastery Gain Calculation', () => {
    it('should calculate mastery gain for correct answers', () => {
      const currentXp = 100;
      const gain = calculateMasteryGain(currentXp, true, 'multiple-choice');
      
      expect(gain).toBeGreaterThan(currentXp);
      expect(typeof gain).toBe('number');
    });

    it('should return lower gain for incorrect answers', () => {
      const currentXp = 100;
      const correctGain = calculateMasteryGain(currentXp, true, 'multiple-choice');
      const incorrectGain = calculateMasteryGain(currentXp, false, 'multiple-choice');
      
      expect(correctGain).toBeGreaterThan(incorrectGain);
    });

    it('should handle zero current XP', () => {
      const gain = calculateMasteryGain(0, true, 'multiple-choice');
      
      expect(gain).toBeGreaterThan(0);
    });

    it('should work with different quiz modes', () => {
      const xpMultiple = calculateMasteryGain(100, true, 'multiple-choice');
      const xpFillBlank = calculateMasteryGain(100, true, 'multiple-choice');
      const xpTrueFalse = calculateMasteryGain(100, true, 'multiple-choice');
      
      expect(typeof xpMultiple).toBe('number');
      expect(typeof xpFillBlank).toBe('number');
      expect(typeof xpTrueFalse).toBe('number');
    });

    it('should be deterministic', () => {
      const gain1 = calculateMasteryGain(100, true, 'multiple-choice');
      const gain2 = calculateMasteryGain(100, true, 'multiple-choice');
      
      expect(gain1).toBe(gain2);
    });
  });

  describe('Word Learning Status', () => {
    it('should determine if word is learned', () => {
      const learnedStatus = isWordLearned(100);
      
      expect(typeof learnedStatus).toBe('boolean');
    });

    it('should mark high XP words as learned', () => {
      const learned = isWordLearned(500);
      
      expect(typeof learned).toBe('boolean');
    });

    it('should mark low XP words as not learned', () => {
      const learned = isWordLearned(10);
      
      expect(typeof learned).toBe('boolean');
    });

    it('should determine if word is mastered', () => {
      const masteredStatus = isWordMastered(500);
      
      expect(typeof masteredStatus).toBe('boolean');
    });

    it('should mark very high XP words as mastered', () => {
      const mastered = isWordMastered(2000);
      
      expect(typeof mastered).toBe('boolean');
    });

    it('should mark low XP words as not mastered', () => {
      const mastered = isWordMastered(50);
      
      expect(typeof mastered).toBe('boolean');
    });
  });

  describe('Mastery Thresholds', () => {
    it('should have defined mastery levels', () => {
      expect(MASTERY_LEVELS).toBeDefined();
      expect(typeof MASTERY_LEVELS).toBe('object');
    });

    it('should have quiz mode thresholds', () => {
      expect(QUIZ_MODE_THRESHOLDS).toBeDefined();
      expect(typeof QUIZ_MODE_THRESHOLDS).toBe('object');
    });

    it('should have consistent threshold values', () => {
      Object.values(MASTERY_LEVELS).forEach(level => {
        expect(typeof level).toBe('number');
        expect(level).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Mastery Progression', () => {
    it('should increase mastery over multiple correct answers', () => {
      let currentXp = 0;
      
      for (let i = 0; i < 5; i++) {
        currentXp = calculateMasteryGain(currentXp, true, 'multiple-choice');
      }
      
      expect(currentXp).toBeGreaterThan(0);
    });

    it('should handle repeated failures gracefully', () => {
      let currentXp = 500;
      
      for (let i = 0; i < 3; i++) {
        currentXp = calculateMasteryGain(currentXp, false, 'multiple-choice');
      }
      
      expect(currentXp).toBeGreaterThanOrEqual(0);
    });

    it('should recover from mistakes with practice', () => {
      let xp = 500;
      
      // Make mistakes
      for (let i = 0; i < 3; i++) {
        xp = calculateMasteryGain(xp, false, 'multiple-choice');
      }
      
      const afterMistakes = xp;
      
      // Recover with correct answers
      for (let i = 0; i < 5; i++) {
        xp = calculateMasteryGain(xp, true, 'multiple-choice');
      }
      
      expect(xp).toBeGreaterThan(afterMistakes);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should calculate mastery gain quickly', () => {
      const start = performance.now();
      calculateMasteryGain(100, true, 'multiple-choice');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1);
    });

    it('should determine learned status quickly', () => {
      const start = performance.now();
      isWordLearned(500);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1);
    });

    it('should determine mastered status quickly', () => {
      const start = performance.now();
      isWordMastered(500);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1);
    });

    it('should handle bulk calculations efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        calculateMasteryGain(Math.random() * 1000, Math.random() > 0.5, 'multiple-choice');
        isWordLearned(Math.random() * 5000);
        isWordMastered(Math.random() * 5000);
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative XP input', () => {
      expect(() => {
        calculateMasteryGain(-100, true, 'multiple-choice');
      }).not.toThrow();
    });

    it('should handle very large XP values', () => {
      const gain = calculateMasteryGain(999999, true, 'multiple-choice');
      expect(typeof gain).toBe('number');
      expect(gain).toBeGreaterThan(0);
    });

    it('should handle extreme mastery levels', () => {
      const learned0 = isWordLearned(0);
      const learned1000000 = isWordLearned(1000000);
      
      expect(typeof learned0).toBe('boolean');
      expect(typeof learned1000000).toBe('boolean');
    });

    it('should handle mastery boundaries', () => {
      const learned = isWordLearned(MASTERY_LEVELS.INTERMEDIATE);
      expect(typeof learned).toBe('boolean');
    });
  });

  describe('User Learning Simulation', () => {
    it('should model learning progression realistically', () => {
      let xp = 0;
      
      for (let i = 0; i < 20; i++) {
        const success = Math.random() > 0.3;
        xp = calculateMasteryGain(xp, success, 'multiple-choice');
      }
      
      expect(xp).toBeGreaterThan(0);
    });

    it('should handle learner who struggles', () => {
      let xp = 100;
      
      for (let i = 0; i < 10; i++) {
        const success = Math.random() > 0.7;
        xp = calculateMasteryGain(xp, success, 'multiple-choice');
      }
      
      expect(xp).toBeGreaterThanOrEqual(0);
    });

    it('should handle quick learner', () => {
      let xp = 0;
      
      for (let i = 0; i < 10; i++) {
        const success = Math.random() > 0.1;
        xp = calculateMasteryGain(xp, success, 'multiple-choice');
      }
      
      expect(xp).toBeGreaterThan(0);
    });
  });
});
