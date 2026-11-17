import { validateQuizAnswer } from '../quizAnswerValidation';
import { getAnswerScoreMultiplier, getCloseMatchFeedback } from '../answerValidation';
import { getWordsForLanguage } from '../wordService';
import type { Word } from '../wordService';

jest.mock('../wordService', () => ({ getWordsForLanguage: jest.fn() }));

const course: Word[] = [
  { id: 'es:1', term: 'biblioteca', definition: 'bibliotheek' },
  { id: 'es:2', term: 'trabajos', definition: 'werken', acceptedAnswers: ['banen'] },
  { id: 'es:3', term: 'trabajar', definition: 'werken (ww)' },
  { id: 'es:4', term: 'perro', definition: 'hond' },
  { id: 'es:5', term: 'pero', definition: 'maar' },
  { id: 'es:6', term: 'hornear', definition: 'bakken' },
  { id: 'es:7', term: 'suspender', definition: 'zakken' },
];
const byId = (id: string) => course.find(w => w.id === id) as Word;
const reverse = (w: Word): Word => ({ ...w, direction: 'term-to-definition' });

beforeEach(() => {
  (getWordsForLanguage as jest.Mock).mockReturnValue(course);
});

describe('typo tolerance in typed quiz modes', () => {
  it('accepts a one-letter slip, marks it as a typo and shows the right spelling', () => {
    const result = validateQuizAnswer('bibliotca', byId('es:1'), 'open-answer', 'es');
    expect(result).toMatchObject({
      isCorrect: true,
      closeMatch: 'typo',
      matchedAnswer: 'biblioteca',
    });
    expect(getCloseMatchFeedback(result)).toBe('✓ Almost! Spelled: biblioteca');
  });

  it('scores a typo below an accent variant and well below an exact answer', () => {
    const typo = validateQuizAnswer('bibliotca', byId('es:1'), 'open-answer', 'es');
    const exact = validateQuizAnswer('biblioteca', byId('es:1'), 'open-answer', 'es');
    expect(getAnswerScoreMultiplier(exact)).toBe(1);
    expect(getAnswerScoreMultiplier(typo)).toBeCloseTo(0.7, 5);
  });

  it('also applies to fill-in-the-blank', () => {
    expect(
      validateQuizAnswer('bibliotca', byId('es:1'), 'fill-in-the-blank', 'es').closeMatch
    ).toBe('typo');
  });

  it('never applies to multiple choice', () => {
    expect(validateQuizAnswer('bibliotca', byId('es:1'), 'multiple-choice', 'es').isCorrect).toBe(
      false
    );
  });

  it('does not forgive short words', () => {
    expect(validateQuizAnswer('pero', byId('es:4'), 'open-answer', 'es').isCorrect).toBe(false);
  });

  it('rejects an answer that is another word of the course (trabajar for trabajos)', () => {
    expect(validateQuizAnswer('trabajar', byId('es:2'), 'open-answer', 'es').isCorrect).toBe(false);
    expect(validateQuizAnswer('trabajoz', byId('es:2'), 'open-answer', 'es').closeMatch).toBe(
      'typo'
    );
  });

  it('forgives a slip in the Dutch answer when translating to Dutch', () => {
    expect(
      validateQuizAnswer('bibliothek', reverse(byId('es:1')), 'open-answer', 'es').closeMatch
    ).toBe('typo');
  });

  it('but not when the slip is another Dutch word of the course (zakken for bakken)', () => {
    expect(validateQuizAnswer('zakken', reverse(byId('es:6')), 'open-answer', 'es').isCorrect).toBe(
      false
    );
    expect(validateQuizAnswer('bakkn', reverse(byId('es:6')), 'open-answer', 'es').closeMatch).toBe(
      'typo'
    );
  });

  it('prefers an exact match over a typo of another accepted answer', () => {
    const result = validateQuizAnswer('banen', reverse(byId('es:2')), 'open-answer', 'es');
    expect(result.isCorrect).toBe(true);
    expect(result.closeMatch).toBeUndefined();
  });

  it('fails closed when the course words cannot be loaded', () => {
    (getWordsForLanguage as jest.Mock).mockImplementation(() => {
      throw new Error('no data');
    });
    // 'fr' has not been looked up yet, so the lookup (and its failure) really runs
    expect(validateQuizAnswer('bibliotca', byId('es:1'), 'open-answer', 'fr').isCorrect).toBe(
      false
    );
  });
});
