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

const normalize = (text: string, languageCode: string): string => {
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
  return normalize(answer, languageCode) === normalize(expected, languageCode) ? 'accent' : 'none';
};
