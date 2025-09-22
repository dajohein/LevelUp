// Import dependencies
import spanishData from '../data/es.json';
import germanData from '../data/de.json';
import { calculateMasteryDecay } from './masteryService';
import type { WordProgress } from '../store/types';

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
  words: Word[];
}

export interface WordList {
  [key: string]: LanguageData;
}

// Add unique IDs to words
const addIdsToWords = (words: Omit<Word, 'id'>[], langCode: string): Word[] => {
  return words.map((word, index) => ({
    ...word,
    id: `${langCode}-${index}`,
  }));
};

export const words: { [key: string]: LanguageData } = {
  es: {
    name: spanishData.name,
    from: spanishData.from,
    words: addIdsToWords(spanishData.words as Omit<Word, 'id'>[], 'es'),
  },
  de: {
    name: germanData.name,
    from: germanData.from,
    words: addIdsToWords(germanData.words as Omit<Word, 'id'>[], 'de'),
  },
};

export const getWordsForLanguage = (languageCode: string): Word[] => {
  return words[languageCode]?.words || [];
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
  // Base priority is inverse of mastery (lower mastery = higher priority)
  let priority = mastery;

  if (!progress) {
    // New words get highest priority
    return 0;
  }

  // Heavily favor words with low mastery (below 70%)
  if (mastery < 70) {
    priority = mastery * 0.5; // Much higher priority for learning words
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
      priority *= 0.3; // Significantly boost priority
    }
  }

  // Reduce priority for incorrect answer streaks
  if (progress.timesIncorrect > progress.timesCorrect && progress.timesIncorrect > 2) {
    priority *= 0.4; // Very high priority for problematic words
  }

  return Math.max(0, priority);
};

export const getRandomWord = (
  languageCode: string,
  wordProgress: { [key: string]: WordProgress }
): { word: Word | null; options: string[] } => {
  const languageWords = getWordsForLanguage(languageCode);
  if (languageWords.length === 0) return { word: null, options: [] };

  // Calculate current mastery for all words
  const wordsWithMastery = languageWords.map(word => {
    const progress = wordProgress[word.id];
    if (!progress) {
      return { ...word, currentMastery: 0 };
    }

    const decayedMastery = calculateMasteryDecay(progress.lastPracticed, progress.xp);

    return {
      ...word,
      currentMastery: decayedMastery,
    };
  });

  // Separate words by mastery level for systematic learning
  const strugglingWords = wordsWithMastery.filter(w => w.currentMastery < 50);
  const learningWords = wordsWithMastery.filter(
    w => w.currentMastery >= 50 && w.currentMastery < 70
  );
  const learnedWords = wordsWithMastery.filter(
    w => w.currentMastery >= 70 && w.currentMastery < 90
  );
  const masteredWords = wordsWithMastery.filter(w => w.currentMastery >= 90);

  // Priority system: focus on struggling and learning words
  let candidatePool: typeof wordsWithMastery = [];

  if (strugglingWords.length > 0) {
    // 70% chance to pick struggling words
    candidatePool = Math.random() < 0.7 ? strugglingWords : [...strugglingWords, ...learningWords];
  } else if (learningWords.length > 0) {
    // 60% chance to pick learning words, 40% learned words
    candidatePool = Math.random() < 0.6 ? learningWords : [...learningWords, ...learnedWords];
  } else if (learnedWords.length > 0) {
    // 50% chance learned words, 50% all words (for maintenance)
    candidatePool = Math.random() < 0.5 ? learnedWords : wordsWithMastery;
  } else {
    // All words are mastered - use spaced repetition
    candidatePool = wordsWithMastery;
  }

  // Sort candidate pool by priority
  const sortedCandidates = candidatePool.sort((a, b) => {
    const aPriority = calculateWordPriority(a.currentMastery, wordProgress[a.id]);
    const bPriority = calculateWordPriority(b.currentMastery, wordProgress[b.id]);
    return aPriority - bPriority;
  });

  // Select from top priority words with weighted randomization
  const topCandidates = sortedCandidates.slice(
    0,
    Math.max(1, Math.ceil(sortedCandidates.length * 0.3))
  );
  const weights = topCandidates.map((_, index) => Math.pow(2, topCandidates.length - index));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const randomValue = Math.random() * totalWeight;

  let currentWeight = 0;
  let selectedIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    currentWeight += weights[i];
    if (randomValue <= currentWeight) {
      selectedIndex = i;
      break;
    }
  }

  const selectedWord = topCandidates[selectedIndex];
  const direction = selectedWord.direction || 'definition-to-term';

  // Generate incorrect options intelligently:
  // 1. Exclude mastered words from multiple choice (they shouldn't appear as distractors)
  // 2. Prefer words from similar mastery levels
  const optionCandidates = wordsWithMastery.filter(
    w => w.id !== selectedWord.id && w.currentMastery < 90 // Exclude mastered words from being distractors
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

  // Insert correct answer at random position
  const options = [...incorrectOptions];
  const correctPos = Math.floor(Math.random() * 4);
  options.splice(correctPos, 0, correctAnswer);

  return {
    word: {
      ...selectedWord,
      mastery: selectedWord.currentMastery,
    },
    options,
  };
};
