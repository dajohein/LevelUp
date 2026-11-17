import type { Word } from './wordService';
import { validateAnswer, type AnswerValidation } from './answerValidation';
import { isTypo, normalizeForMatching } from './answerMatching';
import { getWordsForLanguage } from './wordService';
import { logger } from './logger';

const openEndedModes = ['contextual-analysis', 'usage-example', 'synonym-antonym'];

export const getQuizAnswerDirection = (
  word: Word,
  quizMode: string
): NonNullable<Word['direction']> => {
  if (quizMode === 'fill-in-the-blank') {
    return 'definition-to-term';
  }

  return word.direction || 'definition-to-term';
};

// Modes where the learner types the answer; only there is a one-letter slip a typo
const typedModes = ['open-answer', 'fill-in-the-blank'];

const knownWordsCache = new Map<string, Set<string>>();

/** Clears the known-word cache (tests, or after course data is reloaded). */
export const resetKnownWordsCache = (): void => knownWordsCache.clear();

/**
 * Every word of the course, from every field that holds a real word (term, definition, accepted
 * answers, forms, synonyms), normalized for `normalizeLanguage`.
 *
 * One index per normalization: Dutch folding turns Spanish `ñ` into `n`, which Spanish matching
 * deliberately keeps apart, so a single shared set would wrongly treat `espanol` as a known word.
 * The caller queries the index that matches the language it normalized the answer with.
 *
 * Which field holds the course language and which the Dutch side is not consistent across the
 * course files (some store the German in `definition`), so the sides are not told apart: a typo
 * that happens to be any other word of the course is rejected.
 *
 * Throws if the course has no words: with nothing to check against we cannot rule out that an
 * answer is another word, so the caller must fail closed (and an empty result is not cached).
 */
const getKnownWords = (languageCode: string, normalizeLanguage: string): Set<string> => {
  const cacheKey = `${languageCode}|${normalizeLanguage}`;
  const cached = knownWordsCache.get(cacheKey);
  if (cached) return cached;

  const words = getWordsForLanguage(languageCode);
  if (words.length === 0) throw new Error(`No course words available for "${languageCode}"`);

  const known = new Set<string>();
  // Whole entries and their individual words, so that a slip that turns one word of a phrase
  // into another real word ("die Maus" -> "das Maus" for "das Haus") is caught too
  const add = (text: string | undefined) => {
    if (!text) return;
    const normalized = normalizeForMatching(text, normalizeLanguage);
    known.add(normalized);
    normalized.split(/\s+/).forEach(token => token && known.add(token));
  };
  for (const word of words) {
    add(word.term);
    add(word.definition);
    word.acceptedAnswers?.forEach(add);
    word.forms?.forEach(add);
    word.synonyms?.forEach(add);
  }
  knownWordsCache.set(cacheKey, known);
  return known;
};

/**
 * Accepts a one-letter slip when no exact or variant match was found. Fails closed: if the course
 * words cannot be loaded we cannot rule out that the answer is another word, so it stays wrong.
 */
const findTypoMatch = (
  answer: string,
  candidates: Array<{ text: string; language: string }>,
  languageCode: string
): AnswerValidation | null => {
  try {
    // Build every index first so a failure disables typo tolerance as a whole
    for (const { language } of candidates) getKnownWords(languageCode, language);
  } catch (error) {
    // Fail closed, but not silently: otherwise typo tolerance would just stop working unnoticed
    logger.warn(`Typo tolerance disabled for "${languageCode}":`, error);
    return null;
  }

  for (const { text, language } of candidates) {
    const known = getKnownWords(languageCode, language);
    if (isTypo(answer, text, language, normalized => known.has(normalized))) {
      return {
        isCorrect: true,
        capitalizationCorrect: true,
        capitalizationPenalty: 1,
        closeMatch: 'typo',
        matchedAnswer: text,
      };
    }
  }
  return null;
};

/**
 * Validate the answer for the active quiz mode, including optional open-answer
 * alternatives while retaining language-specific capitalization feedback.
 */
export const validateQuizAnswer = (
  answer: string,
  word: Word,
  quizMode: string,
  languageCode: string
): AnswerValidation => {
  if (openEndedModes.includes(quizMode)) {
    const isCorrect = answer.trim().length > 0;
    return {
      isCorrect,
      capitalizationCorrect: true,
      capitalizationPenalty: 1,
    };
  }

  const direction = word.direction || 'definition-to-term';
  const correctAnswer =
    quizMode === 'fill-in-the-blank'
      ? word.term
      : direction === 'definition-to-term'
        ? word.term
        : word.definition;
  const answers =
    quizMode === 'open-answer' ? [correctAnswer, ...(word.acceptedAnswers ?? [])] : [correctAnswer];
  const languageOf = (index: number) =>
    index > 0 && direction === 'term-to-definition' ? 'nl' : languageCode;
  const validations = answers.map((candidate, index) =>
    validateAnswer(answer.trim(), candidate.trim(), languageOf(index))
  );

  if (typedModes.includes(quizMode) && !validations.some(validation => validation.isCorrect)) {
    const typo = findTypoMatch(
      answer.trim(),
      answers.map((text, index) => ({ text: text.trim(), language: languageOf(index) })),
      languageCode
    );
    if (typo) return typo;
  }

  // Prefer the best correct match: exact spelling, then variant spelling, then capitalization errors
  return (
    validations.find(
      validation =>
        validation.isCorrect && validation.capitalizationCorrect && !validation.closeMatch
    ) ??
    validations.find(validation => validation.isCorrect && validation.capitalizationCorrect) ??
    validations.find(validation => validation.isCorrect) ??
    validations[0]
  );
};
