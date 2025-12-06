/**
 * Option Generation Utilities
 *
 * Shared utilities for generating quiz options across all challenge services.
 * Ensures consistent 4-option multiple choice and module-scoped option generation.
 */

import { Word } from './wordService';
import { getModulesForLanguage, getWordsForModule } from './moduleService';
import { logger } from './logger';

/**
 * Generate multiple choice options scoped to the same module as the word
 * @param word - The target word for the question
 * @param languageCode - The language code (e.g., 'es', 'de', 'nl')
 * @param allWords - All available words for fallback
 * @returns Array of exactly 4 options with the correct answer randomly positioned
 */
export function generateModuleScopedOptions(
  word: Word,
  languageCode: string,
  allWords: Word[]
): string[] {
  const direction = word.direction || 'definition-to-term';
  const correctAnswer = direction === 'definition-to-term' ? word.term : word.definition;

  // Find which module this word belongs to
  const modules = getModulesForLanguage(languageCode);
  let moduleWords: Word[] = [];

  for (const module of modules) {
    const wordsInModule = getWordsForModule(languageCode, module.id);
    if (wordsInModule.some(w => w.id === word.id)) {
      moduleWords = wordsInModule;
      console.log(
        `🎯 Found word "${word.term}" in module "${module.name}" with ${wordsInModule.length} words`
      );
      break;
    }
  }

  // If we couldn't find the module or module has too few words, fallback to all words
  if (moduleWords.length < 4) {
    console.log(
      `⚠️ Module has only ${moduleWords.length} words, using all available words for options`
    );
    moduleWords = allWords;
  }

  // Generate options from module words
  const incorrectOptions: string[] = [];
  const shuffledWords = [...moduleWords].sort(() => 0.5 - Math.random());

  for (const candidate of shuffledWords) {
    if (candidate.id !== word.id && incorrectOptions.length < 3) {
      const incorrectAnswer =
        direction === 'definition-to-term' ? candidate.term : candidate.definition;
      if (incorrectAnswer !== correctAnswer && !incorrectOptions.includes(incorrectAnswer)) {
        incorrectOptions.push(incorrectAnswer);
      }
    }
  }

  // If still not enough options, pad with remaining words from allWords
  if (incorrectOptions.length < 3) {
    const remainingWords = allWords.filter(
      w => w.id !== word.id && !moduleWords.some(mw => mw.id === w.id)
    );

    for (const candidate of remainingWords) {
      if (incorrectOptions.length < 3) {
        const incorrectAnswer =
          direction === 'definition-to-term' ? candidate.term : candidate.definition;
        if (incorrectAnswer !== correctAnswer && !incorrectOptions.includes(incorrectAnswer)) {
          incorrectOptions.push(incorrectAnswer);
        }
      }
    }
  }

  console.log(
    `🔍 Debug: Word "${word.term}", collected ${incorrectOptions.length} incorrect options: [${incorrectOptions.join(', ')}]`
  );

  // Create final options with correct answer at random position
  const options = [...incorrectOptions];

  // Ensure we have exactly 3 incorrect options before adding the correct one
  while (options.length < 3) {
    // Fallback: duplicate some options if needed (shouldn't happen but safety check)
    const fallbackWords = allWords.filter(w => w.id !== word.id);
    for (const candidate of fallbackWords) {
      if (options.length < 3) {
        const incorrectAnswer =
          direction === 'definition-to-term' ? candidate.term : candidate.definition;
        if (incorrectAnswer !== correctAnswer && !options.includes(incorrectAnswer)) {
          options.push(incorrectAnswer);
        }
      }
    }
    break; // Prevent infinite loop
  }

  // Now we should have exactly 3 incorrect options, add the correct one
  const correctPos = Math.floor(Math.random() * 4); // 0, 1, 2, or 3
  options.splice(correctPos, 0, correctAnswer);

  // Final safety check: ensure we have exactly 4 options
  if (options.length !== 4) {
    logger.warn('Option generation mismatch', { 
      expected: 4, 
      actual: options.length, 
      word: word.term 
    });
    // Emergency fallback: pad or trim to exactly 4
    while (options.length < 4) {
      options.push('Option ' + options.length); // Emergency placeholder
    }
    options.splice(4); // Trim to exactly 4
  }

  console.log(
    `🎯 Generated module-scoped options for "${word.term}": [${options.join(', ')}] (${options.length} total)`
  );

  return options;
}

/**
 * Generate scrambled versions of a word for letter scramble quiz
 * @param word - The word to scramble
 * @returns Array of up to 3 scrambled versions
 */
/**
 * Generate scrambled versions of a word with configurable difficulty
 * @param word - The word to scramble
 * @param difficulty - Scrambling intensity: 'easy' (30%), 'medium' (60%), 'hard' (90%), 'boss' (95%)
 * @param count - Number of scrambled versions to generate (default: 3)
 */
export function generateScrambledVersions(
  word: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'boss' = 'medium',
  count = 3
): string[] {
  const scrambled: string[] = [];

  // Calculate scrambling intensity based on difficulty
  const intensityMap = {
    easy: 0.3, // 30% scrambling
    medium: 0.6, // 60% scrambling
    hard: 0.9, // 90% scrambling
    boss: 0.95, // 95% scrambling (boss-level)
  };

  const intensity = intensityMap[difficulty];

  // Create scrambled versions
  for (let i = 0; i < count + 2; i++) {
    // Generate extra to ensure we get enough unique ones
    const scrambledWord = scrambleWordWithIntensity(word, intensity, difficulty);

    // Ensure it's different from original and not already included
    if (scrambledWord !== word && !scrambled.includes(scrambledWord)) {
      scrambled.push(scrambledWord);
    }

    // Stop when we have enough
    if (scrambled.length >= count) break;
  }

  return scrambled.slice(0, count);
}

/**
 * Scramble a word with specific intensity and strategy
 */
function scrambleWordWithIntensity(
  word: string,
  intensity: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'boss'
): string {
  if (word.length <= 2) return word; // Don't scramble very short words

  const chars = word.split('');
  const wordLength = chars.length;

  // Calculate how many character swaps to perform
  const swapCount = Math.max(1, Math.floor(intensity * wordLength));

  // Different scrambling strategies based on difficulty
  switch (difficulty) {
    case 'easy':
      // Easy: Simple adjacent swaps
      return scrambleAdjacent(chars, swapCount);

    case 'medium':
      // Medium: Random swaps with some structure preservation
      return scrambleRandom(chars, swapCount, true);

    case 'hard':
      // Hard: Aggressive random swaps
      return scrambleRandom(chars, swapCount, false);

    case 'boss':
      // Boss: Maximum chaos with advanced techniques
      return scrambleBoss(chars, intensity);

    default:
      return scrambleRandom(chars, swapCount, true);
  }
}

/**
 * Easy scrambling: Adjacent character swaps
 */
function scrambleAdjacent(chars: string[], swapCount: number): string {
  const result = [...chars];

  for (let i = 0; i < swapCount && i < result.length - 1; i++) {
    // Swap adjacent characters
    const pos = Math.floor(Math.random() * (result.length - 1));
    [result[pos], result[pos + 1]] = [result[pos + 1], result[pos]];
  }

  return result.join('');
}

/**
 * Medium/Hard scrambling: Random swaps with optional structure preservation
 */
function scrambleRandom(chars: string[], swapCount: number, preserveStructure: boolean): string {
  const result = [...chars];

  for (let i = 0; i < swapCount; i++) {
    let pos1 = Math.floor(Math.random() * result.length);
    let pos2 = Math.floor(Math.random() * result.length);

    // If preserving structure, avoid swapping first/last characters too often
    if (preserveStructure && Math.random() < 0.7) {
      const middle = Math.floor(result.length / 2);
      const range = Math.max(1, middle - 1);
      pos1 = Math.max(
        1,
        Math.min(result.length - 2, middle - range + Math.floor(Math.random() * (range * 2)))
      );
      pos2 = Math.max(
        1,
        Math.min(result.length - 2, middle - range + Math.floor(Math.random() * (range * 2)))
      );
    }

    [result[pos1], result[pos2]] = [result[pos2], result[pos1]];
  }

  return result.join('');
}

/**
 * Boss-level scrambling: Maximum chaos with advanced techniques
 */
function scrambleBoss(chars: string[], intensity: number): string {
  const result = [...chars];
  const length = result.length;

  // Phase 1: Aggressive random swaps
  const aggressiveSwaps = Math.floor(intensity * length * 1.5); // Even more swaps
  for (let i = 0; i < aggressiveSwaps; i++) {
    const pos1 = Math.floor(Math.random() * length);
    const pos2 = Math.floor(Math.random() * length);
    [result[pos1], result[pos2]] = [result[pos2], result[pos1]];
  }

  // Phase 2: Segment reversal (occasionally reverse sections)
  if (length > 4 && Math.random() < 0.4) {
    const start = Math.floor(Math.random() * (length - 2));
    const end = Math.min(length, start + 2 + Math.floor(Math.random() * 3));
    const segment = result.slice(start, end).reverse();
    result.splice(start, end - start, ...segment);
  }

  // Phase 3: Final chaos swaps
  const chaosSwaps = Math.floor(length / 2);
  for (let i = 0; i < chaosSwaps; i++) {
    const pos1 = Math.floor(Math.random() * length);
    const pos2 = Math.floor(Math.random() * length);
    [result[pos1], result[pos2]] = [result[pos2], result[pos1]];
  }

  return result.join('');
}
