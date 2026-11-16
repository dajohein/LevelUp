import { matchAnswer } from '../answerMatching';

describe('matchAnswer', () => {
  it.each([
    // Spanish: accents optional, ñ is a different letter
    ['es', 'cafe', 'café', 'accent'],
    ['es', 'CAFÉ', 'café', 'exact'],
    ['es', 'ano', 'año', 'none'],
    ['es', 'año', 'año', 'exact'],
    ['es', 'esta', 'está', 'accent'],
    ['es', 'perro', 'gato', 'none'],
    // German: only standard transliterations, never plain a/o/u/s for umlaut/ß
    ['de', 'schoen', 'schön', 'accent'],
    ['de', 'schon', 'schön', 'none'],
    ['de', 'strasse', 'Straße', 'accent'],
    ['de', 'Fuesse', 'Füße', 'accent'],
    ['de', 'Füße', 'füsse', 'accent'],
    ['de', 'hund', 'Hund', 'exact'],
    // Dutch (answers in the learner's language)
    ['nl', 'financiele', 'financiële', 'accent'],
    ['nl', 'cafe', 'café', 'accent'],
    // Languages without rules stay strict
    ['fr', 'cafe', 'café', 'none'],
  ] as const)('%s: "%s" vs "%s" → %s', (language, answer, expected, kind) => {
    expect(matchAnswer(answer, expected, language)).toBe(kind);
  });

  it('treats composed and decomposed accents the same', () => {
    expect(matchAnswer('café', 'café', 'es')).toBe('exact');
  });
});
