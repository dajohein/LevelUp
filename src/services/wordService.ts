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
  flag: string;
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
    flag: spanishData.flag,
    words: addIdsToWords(spanishData.words as Omit<Word, 'id'>[], 'es'),
  },
  de: {
    name: germanData.name,
    from: germanData.from,
    flag: germanData.flag,
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

export const getRandomWord = (
  languageCode: string,
  wordProgress: { [key: string]: WordProgress },
  lastWordId?: string
): { word: Word | null; options: string[]; quizMode: 'multiple-choice' | 'open-answer' } => {
  const languageWords = getWordsForLanguage(languageCode);
  if (languageWords.length === 0) return { word: null, options: [], quizMode: 'multiple-choice' };

  // If we only have one word, return it (can't avoid repetition)
  if (languageWords.length === 1) {
    const selectedWord = languageWords[0];
    const direction = selectedWord.direction || 'definition-to-term';
    const correctAnswer = direction === 'definition-to-term' ? selectedWord.term : selectedWord.definition;
    return { word: selectedWord, options: [correctAnswer], quizMode: 'multiple-choice' };
  }

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

  console.log('📊 Word mastery levels:');
  wordsWithMastery.forEach(w => {
    const progress = wordProgress[w.id];
    console.log(`${w.term}: mastery=${w.currentMastery.toFixed(1)}%, XP=${progress?.xp || 0}, correct=${progress?.timesCorrect || 0}, incorrect=${progress?.timesIncorrect || 0}`);
  });

  // Filter out the last word to prevent immediate repetition
  const availableWords = lastWordId 
    ? wordsWithMastery.filter(w => w.id !== lastWordId)
    : wordsWithMastery;

  // If filtering left us with no words, use all words (shouldn't happen with >1 word)
  const candidateWords = availableWords.length > 0 ? availableWords : wordsWithMastery;

  // Separate words by mastery level for systematic learning
  const strugglingWords = candidateWords.filter(w => w.currentMastery < 50);
  const learningWords = candidateWords.filter(
    w => w.currentMastery >= 50 && w.currentMastery < 70
  );
  const learnedWords = candidateWords.filter(
    w => w.currentMastery >= 70 && w.currentMastery < 90
  );
  const masteredWords = candidateWords.filter(w => w.currentMastery >= 90);

  // Priority system: much more aggressively focus on struggling and learning words
  let candidatePool: typeof candidateWords = [];

  if (strugglingWords.length > 0) {
    // 85% chance to pick struggling words exclusively
    if (Math.random() < 0.85) {
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
  } else if (learnedWords.length > 0) {
    // 60% chance learned words only, 40% include mastered for maintenance
    if (Math.random() < 0.6) {
      candidatePool = learnedWords;
    } else {
      candidatePool = [...learnedWords, ...masteredWords];
    }
  } else {
    // All words are mastered - use spaced repetition
    candidatePool = candidateWords;
  }

  // FAILSAFE: If pool is too small, expand it to ensure variety
  if (candidatePool.length < 5 && candidateWords.length >= 5) {
    candidatePool = candidateWords;
  }

  // Sort candidate pool by priority (ascending: lower number = higher priority)
  const sortedCandidates = candidatePool.sort((a, b) => {
    const aPriority = calculateWordPriority(a.currentMastery, wordProgress[a.id]);
    const bPriority = calculateWordPriority(b.currentMastery, wordProgress[b.id]);
    return aPriority - bPriority;
  });

  // Select from top priority words with weighted randomization
  // Take the first 30% of candidates (highest priority)
  const topCandidates = sortedCandidates.slice(
    0,
    Math.max(1, Math.ceil(sortedCandidates.length * 0.3))
  );
  
  // Assign weights - FIRST items (highest priority) get highest weights
  const weights = topCandidates.map((_, index) => Math.pow(2, topCandidates.length - index - 1));
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
  const optionCandidates = candidateWords.filter(
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

  // Determine quiz mode based on word's mastery level
  const currentMastery = selectedWord.currentMastery;
  const quizMode: 'multiple-choice' | 'open-answer' = currentMastery >= 50 ? 'open-answer' : 'multiple-choice';

  // For open-answer mode, we don't need multiple choice options
  const options = quizMode === 'open-answer' ? [] : (() => {
    // Insert correct answer at random position for multiple choice
    const opts = [...incorrectOptions];
    const correctPos = Math.floor(Math.random() * 4);
    opts.splice(correctPos, 0, correctAnswer);
    return opts;
  })();

  return {
    word: {
      ...selectedWord,
      mastery: selectedWord.currentMastery,
    },
    options,
    quizMode,
  };
};
