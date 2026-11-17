// Language-agnostic answer validation using configurable rules
import { matchAnswer } from './answerMatching';
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
  /** Set when the answer was accepted via an accepted spelling variant (accents, ae/oe/ue/ss). */
  closeMatch?: 'accent';
  /** The canonical spelling, set together with `closeMatch`. */
  matchedAnswer?: string;
}

/** Score multiplier for variant spellings; capitalization penalties apply on top. */
export const CLOSE_MATCH_SCORE_FACTOR = 0.9;

/** Combined score multiplier for a validation result. */
export const getAnswerScoreMultiplier = (validation: AnswerValidation): number =>
  validation.capitalizationPenalty * (validation.closeMatch ? CLOSE_MATCH_SCORE_FACTOR : 1);

/** Feedback shown when an answer was accepted despite a spelling variant. */
export const getCloseMatchFeedback = (validation: AnswerValidation): string | null =>
  validation.isCorrect && validation.closeMatch && validation.matchedAnswer
    ? `✓ Correct! Spelled: ${validation.matchedAnswer}`
    : null;

// Check capitalization for languages that require it
const checkCapitalization = (
  rawUserAnswer: string,
  rawCorrectAnswer: string,
  language: string
): AnswerValidation => {
  // matchAnswer treats canonically equivalent Unicode (e.g. "Mu\u0308nchen" and "München") as
  // identical, so capitalization must be graded on the same normalized text.
  const userAnswer = rawUserAnswer.normalize('NFC');
  const correctAnswer = rawCorrectAnswer.normalize('NFC');
  const match = matchAnswer(userAnswer, correctAnswer, language);

  if (match === 'none') {
    return {
      isCorrect: false,
      capitalizationCorrect: false,
      capitalizationPenalty: 1.0,
    };
  }

  // Accepted via a spelling variant (e.g. "schoen" for "schön"): capitalization is not graded
  // because the letters differ, so the answer cannot be compared position by position.
  if (match === 'accent') {
    return {
      isCorrect: true,
      capitalizationCorrect: true,
      capitalizationPenalty: 1.0,
      closeMatch: 'accent',
      matchedAnswer: rawCorrectAnswer,
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

  // For other languages, use case-insensitive validation with the language's spelling rules
  const match = matchAnswer(userAnswer, correctAnswer, language);

  return {
    isCorrect: match !== 'none',
    capitalizationCorrect: true, // Not applicable for case-insensitive languages
    capitalizationPenalty: 1.0,
    ...(match === 'accent' && { closeMatch: 'accent' as const, matchedAnswer: correctAnswer }),
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
