// Import dependencies
import { getWordsForModule, getAvailableLanguages } from './moduleService';
import { DataIntegrityError } from '../utils/errorHandling';
import { logger } from './logger';

// Type definitions
interface Context {
  sentence: string;
  translation: string;
  audio?: string;
}

export interface Word {
  id: string; // Unique identifier for each word
  term: string;
  definition: string;
  audio?: string;
  context?: Context;
  level?: number; // Current difficulty level
  mastery?: number; // Current mastery percentage (0-100)
  direction?: 'term-to-definition' | 'definition-to-term'; // Quiz direction
}

export interface LanguageData {
  name: string;
  from: string;
  flag: string;
  words: Word[];
}

export interface WordList {
  [key: string]: LanguageData;
}

// Dynamic language data loading
const getLanguageData = (languageCode: string): LanguageData | null => {
  try {
    const languages = getAvailableLanguages();
    const language = languages.find(l => l.code === languageCode);

    if (!language) {
      return null;
    }

    // Get all words from all modules for this language
    const allWords: Word[] = [];
    for (const moduleInfo of language.info.modules) {
      const moduleWords = getWordsForModule(languageCode, moduleInfo.id);
      allWords.push(...moduleWords);
    }

    return {
      name: language.info.name,
      from: language.info.from,
      flag: language.info.flag,
      words: allWords,
    };
  } catch (error) {
    const dataError = new DataIntegrityError(`Could not load language data for ${languageCode}`, {
      languageCode,
      error,
    });
    logger.warn(dataError.userMessage || dataError.message, { context: dataError.context });
    return null;
  }
};

// Dynamic words object - loads language data on demand
export const words: { [key: string]: LanguageData } = new Proxy(
  {} as { [key: string]: LanguageData },
  {
    get(target: { [key: string]: LanguageData }, prop: string): LanguageData | undefined {
      if (!target[prop]) {
        const languageData = getLanguageData(prop);
        if (languageData) {
          target[prop] = languageData;
        }
      }
      return target[prop];
    },
  }
);

export const getWordsForLanguage = (languageCode: string): Word[] => {
  const languageData = getLanguageData(languageCode);
  return languageData?.words || [];
};

// Get n random items from an array, excluding the one with excludeId
// Legacy word selection functions have been removed.

// Legacy word selection functions have been removed.
// All word selection now uses the centralized WordSelectionManager system.
