// Utility functions for language-specific answer validation

export interface AnswerValidation {
  isCorrect: boolean;
  capitalizationCorrect: boolean;
  capitalizationPenalty: number; // 0-1, where 1 means no penalty
}

// Check if a word should be capitalized in German (nouns, proper nouns, sentence beginnings)
const shouldBeCapitalizedInGerman = (word: string): boolean => {
  // Common German articles that indicate the word is a noun
  const germanArticles = ['der', 'die', 'das', 'den', 'dem', 'des'];

  // Check if the word starts with an article (indicating it's a noun phrase)
  const wordLower = word.toLowerCase();
  for (const article of germanArticles) {
    if (wordLower.startsWith(article + ' ')) {
      return true; // The noun part should be capitalized
    }
  }

  // If it's a single word, assume it's a noun if it's being tested in German
  // In German vocabulary learning, most single words being tested are nouns
  if (!word.includes(' ')) {
    return true; // Single words in German vocabulary are usually nouns
  }

  // Check for common German noun patterns in phrases
  const germanNounPatterns = [
    /\b(der|die|das|den|dem|des)\s+[a-z]/i, // Article + noun
    /\b[A-Z][a-z]*(?:ung|heit|keit|schaft|tum|nis|chen|lein)\b/i, // Common noun endings
    /\b[A-Z][a-z]*(?:er|in)\b/i, // Person/profession endings
  ];

  return germanNounPatterns.some(pattern => pattern.test(word));
};

// Extract the main noun from a German phrase
const extractMainNoun = (phrase: string): string => {
  const words = phrase.split(' ');
  const germanArticles = ['der', 'die', 'das', 'den', 'dem', 'des'];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (germanArticles.includes(word) && i + 1 < words.length) {
      return words[i + 1]; // Return the word after the article
    }
  }

  // If no article found, assume the first word is the main noun
  return words[0];
};

// Check capitalization for German answers
const checkGermanCapitalization = (userAnswer: string, correctAnswer: string): AnswerValidation => {
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
  let capitalizationCorrect = userAnswer === correctAnswer;
  let capitalizationPenalty = 1.0;

  if (!capitalizationCorrect && shouldBeCapitalizedInGerman(correctAnswer)) {
    // Check if the main noun is correctly capitalized
    const userMainNoun = extractMainNoun(userAnswer);
    const correctMainNoun = extractMainNoun(correctAnswer);

    const mainNounCorrect = userMainNoun === correctMainNoun;

    if (mainNounCorrect) {
      // Main noun is correctly capitalized, minor penalty
      capitalizationPenalty = 0.9; // 10% penalty
    } else {
      // Main noun capitalization is wrong, moderate penalty
      capitalizationPenalty = 0.7; // 30% penalty
    }

    // Check if other capitalizations are wrong too
    const userWords = userAnswer.split(' ');
    const correctWords = correctAnswer.split(' ');
    let wrongCapitalizations = 0;

    for (let i = 0; i < Math.min(userWords.length, correctWords.length); i++) {
      if (userWords[i] !== correctWords[i]) {
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
  // For German, use case-sensitive validation
  if (language === 'de') {
    return checkGermanCapitalization(userAnswer, correctAnswer);
  }

  // For other languages, use case-insensitive validation
  const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();

  return {
    isCorrect,
    capitalizationCorrect: true, // Not applicable for non-German
    capitalizationPenalty: 1.0,
  };
};

// Helper function to get capitalization feedback message
export const getCapitalizationFeedback = (
  validation: AnswerValidation,
  language: string
): string | null => {
  if (language !== 'de' || validation.capitalizationCorrect || !validation.isCorrect) {
    return null;
  }

  const penaltyPercent = Math.round((1 - validation.capitalizationPenalty) * 100);

  if (validation.capitalizationPenalty >= 0.9) {
    return `✓ Correct! Remember: German nouns are capitalized (-${penaltyPercent}% bonus)`;
  } else if (validation.capitalizationPenalty >= 0.7) {
    return `✓ Correct! Watch your capitalization: German nouns start with capital letters (-${penaltyPercent}% bonus)`;
  } else {
    return `✓ Correct! Important: German nouns and articles must be properly capitalized (-${penaltyPercent}% bonus)`;
  }
};
