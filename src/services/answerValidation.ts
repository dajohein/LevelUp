// Language-agnostic answer validation using configurable rules
import {
  getLanguageRules,
  shouldBeCapitalized,
  extractMainNoun,
  getCapitalizationFeedbackMessage,
} from '../config/languageRules';

export interface AnswerValidation {
  isCorrect: boolean;
  capitalizationCorrect: boolean;
  capitalizationPenalty: number; // 0.5-1.0, where 1.0 = no penalty
}

// Check capitalization for languages that require it
const checkCapitalization = (
  userAnswer: string,
  correctAnswer: string,
  language: string
): AnswerValidation => {
  const userLower = userAnswer.toLowerCase();
  const correctLower = correctAnswer.toLowerCase();

  // First check if the basic answer is correct
  const isCorrect = userLower === correctLower;

  if (!isCorrect) {
    return {
      isCorrect: false,
      capitalizationCorrect: false,
      capitalizationPenalty: 1.0,
    };
  }

  // If basic answer is correct, check capitalization
  const capitalizationCorrect = userAnswer === correctAnswer;
  let capitalizationPenalty = 1.0;

  if (!capitalizationCorrect && shouldBeCapitalized(correctAnswer, language)) {
    // Check if the main noun is correctly capitalized
    const userMainNoun = extractMainNoun(userAnswer, language);
    const correctMainNoun = extractMainNoun(correctAnswer, language);

    if (userMainNoun.toLowerCase() === correctMainNoun.toLowerCase()) {
      const isMainNounCapitalized = userMainNoun[0] === userMainNoun[0].toUpperCase();

      if (isMainNounCapitalized) {
        // Main noun is capitalized, but other parts might not be
        capitalizationPenalty = 0.9; // Minor penalty
      } else {
        // Main noun is not capitalized
        capitalizationPenalty = 0.7; // Moderate penalty
      }
    } else {
      // More complex capitalization issues
      capitalizationPenalty = 0.6; // Major penalty
    }

    // Count wrong capitalizations to apply additional penalties
    const userWords = userAnswer.split(' ');
    const correctWords = correctAnswer.split(' ');
    let wrongCapitalizations = 0;

    for (let i = 0; i < Math.min(userWords.length, correctWords.length); i++) {
      if (
        userWords[i].toLowerCase() === correctWords[i].toLowerCase() &&
        userWords[i] !== correctWords[i]
      ) {
        wrongCapitalizations++;
      }
    }

    // Apply additional penalty for multiple capitalization errors
    if (wrongCapitalizations > 1) {
      capitalizationPenalty *= 0.8; // Additional 20% penalty
    }
  }

  return {
    isCorrect: true,
    capitalizationCorrect,
    capitalizationPenalty: Math.max(0.5, capitalizationPenalty), // Minimum 50% of points
  };
};

// Main validation function
export const validateAnswer = (
  userAnswer: string,
  correctAnswer: string,
  language: string
): AnswerValidation => {
  const rules = getLanguageRules(language);

  // Use case-sensitive validation for languages that require it
  if (rules.caseSensitive) {
    return checkCapitalization(userAnswer, correctAnswer, language);
  }

  // For other languages, use case-insensitive validation
  const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

  return {
    isCorrect,
    capitalizationCorrect: true, // Not applicable for case-insensitive languages
    capitalizationPenalty: 1.0,
  };
};

// Helper function to get capitalization feedback message
export const getCapitalizationFeedback = (
  validation: AnswerValidation,
  language: string
): string | null => {
  const rules = getLanguageRules(language);

  if (!rules.caseSensitive || validation.capitalizationCorrect || !validation.isCorrect) {
    return null;
  }

  const penaltyPercent = Math.round((1 - validation.capitalizationPenalty) * 100);

  let severity: 'minor' | 'moderate' | 'major';
  if (validation.capitalizationPenalty >= 0.9) {
    severity = 'minor';
  } else if (validation.capitalizationPenalty >= 0.7) {
    severity = 'moderate';
  } else {
    severity = 'major';
  }

  const message = getCapitalizationFeedbackMessage(language, severity);
  return message ? `${message} (-${penaltyPercent}% bonus)` : null;
};
