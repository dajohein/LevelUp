// Language-specific configuration for answer validation and other rules

/**
 * How strictly spelling variants are matched. Variants that are accepted score slightly less
 * and the learner is shown the canonical spelling.
 */
export interface SpellingRules {
  /** Treat accented letters as their base letters (é = e). */
  foldAccents: boolean;
  /** Letters that are distinct in the language and must never be folded (e.g. Spanish ñ). */
  preserve?: string[];
  /** Standard transliterations accepted for letters, applied to both sides (e.g. German ä → ae). */
  transliterations?: Record<string, string>;
}

export interface LanguageRules {
  spelling?: SpellingRules;
  caseSensitive: boolean;
  capitalizationRequired: boolean;
  articles?: string[];
  nounPatterns?: RegExp[];
  capitalizationFeedback?: {
    minor: string;
    moderate: string;
    major: string;
  };
}

// Default rules that apply to most languages
const defaultRules: LanguageRules = {
  caseSensitive: false,
  capitalizationRequired: false,
};

// Language-specific rules configuration
const languageRulesConfig: Record<string, LanguageRules> = {
  // German-specific rules
  de: {
    // ä/ö/ü/ß change the word (schon ≠ schön), so only the standard ae/oe/ue/ss spellings are accepted
    spelling: {
      foldAccents: false,
      transliterations: { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' },
    },
    caseSensitive: true,
    capitalizationRequired: true,
    articles: ['der', 'die', 'das', 'den', 'dem', 'des'],
    nounPatterns: [
      /\b(der|die|das|den|dem|des)\s+[a-z]/i, // Article + noun
      /\b[A-Z][a-z]*(?:ung|heit|keit|schaft|tum|nis|chen|lein)\b/i, // Common noun endings
      /\b[A-Z][a-z]*(?:er|in)\b/i, // Person/profession endings
    ],
    capitalizationFeedback: {
      minor: '✓ Correct! Remember: German nouns are capitalized',
      moderate: '✓ Correct! Watch your capitalization: German nouns start with capital letters',
      major: '✓ Correct! Important: German nouns and articles must be properly capitalized',
    },
  },

  // Spanish rules (case-insensitive)
  es: {
    // ñ is a different letter (año ≠ ano); other accents may be omitted
    spelling: { foldAccents: true, preserve: ['ñ'] },
    caseSensitive: false,
    capitalizationRequired: false,
  },

  // Dutch (used for answers in the learner's own language)
  nl: {
    spelling: { foldAccents: true },
    caseSensitive: false,
    capitalizationRequired: false,
  },

  // Add more languages here as needed
  // fr: { ... },
  // it: { ... },
};

/**
 * Get language-specific rules for answer validation
 */
export const getLanguageRules = (languageCode: string): LanguageRules => {
  return languageRulesConfig[languageCode] || defaultRules;
};

/**
 * Check if a word should be capitalized based on language rules
 */
export const shouldBeCapitalized = (word: string, languageCode: string): boolean => {
  const rules = getLanguageRules(languageCode);

  if (!rules.capitalizationRequired) {
    return false;
  }

  // Check if the word starts with an article (indicating it's a noun phrase)
  if (rules.articles) {
    const wordLower = word.toLowerCase();
    for (const article of rules.articles) {
      if (wordLower.startsWith(article + ' ')) {
        return true; // The noun part should be capitalized
      }
    }
  }

  // If it's a single word, assume it's a noun if capitalization is required
  if (!word.includes(' ')) {
    return true; // Single words in capitalization-required languages are usually nouns
  }

  // Check for language-specific noun patterns
  if (rules.nounPatterns) {
    return rules.nounPatterns.some(pattern => pattern.test(word));
  }

  return false;
};

/**
 * Extract the main noun from a phrase based on language rules
 */
export const extractMainNoun = (phrase: string, languageCode: string): string => {
  const rules = getLanguageRules(languageCode);
  const words = phrase.split(' ');

  // If language has articles, find the word after the article
  if (rules.articles) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if (rules.articles.includes(word) && i + 1 < words.length) {
        return words[i + 1]; // Return the word after the article
      }
    }
  }

  // If no article found, assume the first word is the main noun
  return words[0];
};

/**
 * Get capitalization feedback message for a language
 */
export const getCapitalizationFeedbackMessage = (
  languageCode: string,
  severity: 'minor' | 'moderate' | 'major'
): string | null => {
  const rules = getLanguageRules(languageCode);

  if (!rules.capitalizationRequired || !rules.capitalizationFeedback) {
    return null;
  }

  return rules.capitalizationFeedback[severity];
};
