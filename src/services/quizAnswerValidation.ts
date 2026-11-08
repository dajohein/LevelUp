import type { Word } from './wordService';
import { validateAnswer, type AnswerValidation } from './answerValidation';

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
  const validations = answers.map((candidate, index) =>
    validateAnswer(
      answer.trim(),
      candidate.trim(),
      index > 0 && direction === 'term-to-definition' ? 'nl' : languageCode
    )
  );

  return (
    validations.find(validation => validation.isCorrect && validation.capitalizationCorrect) ??
    validations.find(validation => validation.isCorrect) ??
    validations[0]
  );
};
