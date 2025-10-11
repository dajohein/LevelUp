// Import dependencies
import { calculateMasteryDecay } from './masteryService';
import { getWordsForModule, getAvailableLanguages } from './moduleService';
import type { WordProgress } from '../store/types';
import { DataIntegrityError } from '../utils/errorHandling';

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
    const dataError = new DataIntegrityError(
      `Could not load language data for ${languageCode}`,
      { languageCode, error }
    );
    console.warn(dataError.userMessage, dataError.context);
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
const getRandomItems = <T extends { id: string }>(
  array: T[],
  count: number,
  excludeId?: string
): T[] => {
  const available = excludeId ? array.filter(item => item.id !== excludeId) : [...array];
  const result: T[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    result.push(...available.splice(randomIndex, 1));
  }

  return result;
};

// Calculate priority for word selection (lower number = higher priority)
const calculateWordPriority = (mastery: number, progress?: WordProgress): number => {
  if (!progress) {
    // New words get highest priority
    return 0;
  }

  // Base priority is inverse of mastery - make this more aggressive
  let priority = mastery;

  // Much more heavily favor words with low mastery
  if (mastery < 30) {
    priority = mastery * 0.1; // Extremely high priority for struggling words
  } else if (mastery < 50) {
    priority = mastery * 0.3; // Very high priority for weak words
  } else if (mastery < 70) {
    priority = mastery * 0.6; // High priority for learning words
  } else if (mastery < 90) {
    priority = mastery * 1.0; // Normal priority for learned words
  } else {
    priority = mastery * 2.0; // Low priority for mastered words
  }

  // Add time-based boost for spaced repetition
  if (progress.lastPracticed) {
    const hoursSinceLastPractice = Math.floor(
      (Date.now() - new Date(progress.lastPracticed).getTime()) / (1000 * 60 * 60)
    );

    // Different intervals based on mastery level
    let targetInterval: number;
    if (mastery >= 90) targetInterval = 168; // 1 week for mastered words
    else if (mastery >= 70) targetInterval = 72; // 3 days for learned words
    else if (mastery >= 50) targetInterval = 24; // 1 day for learning words
    else targetInterval = 4; // 4 hours for struggling words

    // Boost priority if it's time for review
    if (hoursSinceLastPractice >= targetInterval) {
      priority *= 0.3; // Significantly boost priority (lower number)
    }
  }

  // Heavily prioritize words with poor performance
  if (progress.timesIncorrect > progress.timesCorrect && progress.timesIncorrect > 2) {
    priority *= 0.2; // Very high priority for problematic words
  }

  return Math.max(0, priority);
};

// Module-aware version for getting random words from a specific module
export const getRandomWordFromModule = (
  languageCode: string,
  moduleId: string,
  wordProgress: { [key: string]: WordProgress },
  lastWordId?: string
): {
  word: Word | null;
  options: string[];
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
} => {
  const moduleWords = getWordsForModule(languageCode, moduleId);

  if (moduleWords.length === 0) {
    return { word: null, options: [], quizMode: 'multiple-choice' };
  }

  // If we only have one word in the module, return it with just the correct answer
  if (moduleWords.length === 1) {
    const selectedWord = moduleWords[0];
    const direction = selectedWord.direction || 'definition-to-term';
    const correctAnswer =
      direction === 'definition-to-term' ? selectedWord.term : selectedWord.definition;
    return { word: selectedWord, options: [correctAnswer], quizMode: 'multiple-choice' };
  }

  // Use the same logic as getRandomWord but with module words instead of all language words
  return getRandomWordFromWordList(moduleWords, wordProgress, lastWordId);
};

// Helper function to get random word from any word list
const getRandomWordFromWordList = (
  wordList: Word[],
  wordProgress: { [key: string]: WordProgress },
  lastWordId?: string
): {
  word: Word | null;
  options: string[];
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
} => {
  if (wordList.length === 0) return { word: null, options: [], quizMode: 'multiple-choice' };

  // If we only have one word, return it (can't avoid repetition)
  if (wordList.length === 1) {
    const selectedWord = wordList[0];
    const direction = selectedWord.direction || 'definition-to-term';
    const correctAnswer =
      direction === 'definition-to-term' ? selectedWord.term : selectedWord.definition;
    return { word: selectedWord, options: [correctAnswer], quizMode: 'multiple-choice' };
  }

  // Calculate current mastery for all words
  const wordsWithMastery = wordList.map(word => {
    const progress = wordProgress[word.id];
    if (!progress) {
      return { ...word, currentMastery: 0 };
    }

    const currentMastery = calculateMasteryDecay(progress.lastPracticed, progress.xp || 0);
    return { ...word, currentMastery };
  });

  // Filter out the last word if provided to avoid repetition
  const availableWords = lastWordId
    ? wordsWithMastery.filter(w => w.id !== lastWordId)
    : wordsWithMastery;

  const candidateWords = availableWords.length > 0 ? availableWords : wordsWithMastery;

  // Separate words by mastery levels for intelligent selection
  const strugglingWords = candidateWords.filter(w => w.currentMastery < 30);
  const learningWords = candidateWords.filter(w => w.currentMastery >= 30 && w.currentMastery < 70);
  const learnedWords = candidateWords.filter(w => w.currentMastery >= 70 && w.currentMastery < 90);
  const masteredWords = candidateWords.filter(w => w.currentMastery >= 90);

  let candidatePool: typeof candidateWords = [];

  // Prioritize based on mastery levels and ensure struggling words get attention
  if (strugglingWords.length > 0) {
    // 60% chance to focus on struggling words, 40% chance to include others
    if (Math.random() < 0.6) {
      candidatePool = strugglingWords;
    } else {
      candidatePool = [...strugglingWords, ...learningWords];
    }
  } else if (learningWords.length > 0) {
    // 75% chance to pick learning words exclusively, 25% include learned words
    if (Math.random() < 0.75) {
      candidatePool = learningWords;
    } else {
      candidatePool = [...learningWords, ...learnedWords];
    }
  } else {
    // Fallback to all available words if no specific category is dominant
    candidatePool = candidateWords;
  }

  // If no words in the preferred pool, fallback to all candidates
  if (candidatePool.length === 0) {
    candidatePool = candidateWords;
  }

  // Calculate priority scores for each candidate
  const candidatesWithPriority = candidatePool.map(word => {
    const progress = wordProgress[word.id];
    return {
      word,
      priority: calculateWordPriority(word.currentMastery, progress),
    };
  });

  // Sort by priority (lower numbers = higher priority)
  candidatesWithPriority.sort((a, b) => a.priority - b.priority);

  // Select from top candidates with some randomness
  const topCandidatesCount = Math.min(3, candidatesWithPriority.length);
  const topCandidates = candidatesWithPriority.slice(0, topCandidatesCount).map(c => c.word);

  const selectedIndex = Math.floor(Math.random() * topCandidates.length);
  const selectedWord = topCandidates[selectedIndex];
  const direction = selectedWord.direction || 'definition-to-term';

  // Generate incorrect options intelligently
  const optionCandidates = candidateWords.filter(
    w => w.id !== selectedWord.id && w.currentMastery < 90
  );

  // If not enough non-mastered words, include some mastered ones
  if (optionCandidates.length < 3) {
    const masteredOptions = masteredWords.filter(w => w.id !== selectedWord.id);
    optionCandidates.push(...masteredOptions.slice(0, 3 - optionCandidates.length));
  }

  const incorrectOptions = getRandomItems(optionCandidates, 3, selectedWord.id).map(w =>
    direction === 'definition-to-term' ? w.term : w.definition
  );

  // Get correct answer based on direction
  const correctAnswer =
    direction === 'definition-to-term' ? selectedWord.term : selectedWord.definition;

  // Determine quiz mode based on word's mastery level
  const currentMastery = selectedWord.currentMastery;
  let quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';

  if (currentMastery < 20) {
    quizMode = 'multiple-choice';
  } else if (currentMastery < 40) {
    quizMode = 'letter-scramble';
  } else if (currentMastery < 70) {
    // Only use fill-in-the-blank for words that have context
    const hasContext = selectedWord.context && selectedWord.context.sentence;
    if (hasContext) {
      quizMode = Math.random() < 0.5 ? 'fill-in-the-blank' : 'open-answer';
    } else {
      quizMode = 'open-answer';
    }
  } else {
    quizMode = 'open-answer';
  }

  // For multiple choice, create options array
  const options =
    quizMode === 'multiple-choice'
      ? (() => {
          const opts = [...incorrectOptions];
          const correctPos = Math.floor(Math.random() * 4);
          opts.splice(correctPos, 0, correctAnswer);
          return opts;
        })()
      : [];

  return {
    word: {
      ...selectedWord,
      mastery: currentMastery,
    },
    options,
    quizMode,
  };
};

export const getRandomWord = (
  languageCode: string,
  wordProgress: { [key: string]: WordProgress },
  lastWordId?: string
): {
  word: Word | null;
  options: string[];
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
} => {
  const languageWords = getWordsForLanguage(languageCode);
  return getRandomWordFromWordList(languageWords, wordProgress, lastWordId);
};
