import { getLanguageRules } from '../config/languageRules';

/**
 * - `exact`: identical ignoring case
 * - `accent`: identical after the language's accepted spelling variants (accents, ae/oe/ue/ss)
 * - `none`: different
 */
export type MatchKind = 'exact' | 'accent' | 'none';

const COMBINING_MARKS = /\p{M}/gu;
// Private-use code points stand in for letters that must survive accent folding
const placeholder = (index: number) => String.fromCharCode(0xe000 + index);

/** Lowercased, NFC-normalized text with the language's accepted spelling variants folded. */
export const normalizeForMatching = (text: string, languageCode: string): string => {
  const spelling = getLanguageRules(languageCode).spelling;
  let result = text.toLowerCase().normalize('NFC');
  if (!spelling) return result;

  for (const [letter, replacement] of Object.entries(spelling.transliterations ?? {})) {
    result = result.split(letter).join(replacement);
  }

  if (spelling.foldAccents) {
    const preserved = spelling.preserve ?? [];
    preserved.forEach((letter, i) => {
      result = result.split(letter).join(placeholder(i));
    });
    result = result.normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC');
    preserved.forEach((letter, i) => {
      result = result.split(placeholder(i)).join(letter);
    });
  }
  return result;
};

/** Compare a learner's answer with the expected one using the language's spelling rules. */
export const matchAnswer = (answer: string, expected: string, languageCode: string): MatchKind => {
  if (answer.toLowerCase().normalize('NFC') === expected.toLowerCase().normalize('NFC')) {
    return 'exact';
  }
  return normalizeForMatching(answer, languageCode) === normalizeForMatching(expected, languageCode)
    ? 'accent'
    : 'none';
};

/** Fewest letters (spaces and punctuation do not count) in an expected answer for a slip to be forgiven. */
export const MIN_TYPO_LENGTH = 6;

const countLetters = (text: string): number => (text.match(/\p{L}/gu) ?? []).length;

/**
 * True when `a` and `b` differ by exactly one edit: an inserted, deleted or substituted letter,
 * or two adjacent letters swapped ("recieve" for "receive").
 */
export const isOneEditApart = (a: string, b: string): boolean => {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;

  if (a.length === b.length) {
    // substitution, or an adjacent swap
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  // insertion/deletion: dropping one letter from the longer one must give the shorter one
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.slice(i) === longer.slice(i + 1);
};

/**
 * A slip of one letter in a long enough word. `knownWords` holds the normalized words of the
 * course: an answer that is itself a different real word ("perro" for "pero") is a wrong answer,
 * not a typo.
 */
export const isTypo = (
  answer: string,
  expected: string,
  languageCode: string,
  isKnownWord: (normalizedAnswer: string) => boolean
): boolean => {
  const normalizedExpected = normalizeForMatching(expected, languageCode);
  if (countLetters(normalizedExpected) < MIN_TYPO_LENGTH) return false;
  const normalizedAnswer = normalizeForMatching(answer, languageCode);
  if (!isOneEditApart(normalizedAnswer, normalizedExpected)) return false;
  return !isKnownWord(normalizedAnswer);
};
