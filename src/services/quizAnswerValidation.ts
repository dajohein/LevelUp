import type { Word } from './wordService';
import { validateAnswer, type AnswerValidation } from './answerValidation';
import { isTypo, normalizeForMatching } from './answerMatching';
import { getWordsForLanguage } from './wordService';

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

interface KnownWords {
  terms: Set<string>;
  definitions: Set<string>;
}
const knownWordsCache = new Map<string, KnownWords>();

/** Every normalized term (in the course language) and definition/accepted answer (Dutch). */
const getKnownWords = (languageCode: string): KnownWords => {
  const cached = knownWordsCache.get(languageCode);
  if (cached) return cached;
  const known: KnownWords = { terms: new Set(), definitions: new Set() };
  for (const word of getWordsForLanguage(languageCode)) {
    known.terms.add(normalizeForMatching(word.term, languageCode));
    known.definitions.add(normalizeForMatching(word.definition, 'nl'));
    word.acceptedAnswers?.forEach(a => known.definitions.add(normalizeForMatching(a, 'nl')));
  }
  knownWordsCache.set(languageCode, known);
  return known;
};

/**
 * Accepts a one-letter slip when no exact or variant match was found. Fails closed: if the course
 * words cannot be loaded we cannot rule out that the answer is another word, so it stays wrong.
 */
const findTypoMatch = (
  answer: string,
  candidates: Array<{ text: string; language: string }>,
  languageCode: string,
  candidatesAreDefinitions: boolean
): AnswerValidation | null => {
  let known: KnownWords;
  try {
    known = getKnownWords(languageCode);
  } catch {
    return null;
  }
  // The learner is typing either the Dutch side or the course-language side of a word
  const knownSide = candidatesAreDefinitions ? known.definitions : known.terms;

  for (const { text, language } of candidates) {
    if (isTypo(answer, text, language, normalized => knownSide.has(normalized))) {
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
      languageCode,
      quizMode !== 'fill-in-the-blank' && direction === 'term-to-definition'
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
