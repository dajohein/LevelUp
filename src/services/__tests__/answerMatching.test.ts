import { isOneEditApart, isTypo, matchAnswer, MIN_TYPO_LENGTH } from '../answerMatching';

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

describe('isOneEditApart', () => {
  it.each([
    ['biblioteca', 'bibliotca', true], // deletion
    ['biblioteca', 'bibliotecca', true], // insertion
    ['biblioteca', 'bibliotaca', true], // substitution
    ['receive', 'recieve', true], // adjacent swap
    ['perro', 'perro', false], // identical
    ['biblioteca', 'bibliotaaa', false], // two substitutions
    ['biblioteca', 'bibliotc', false], // two deletions
    ['abcdef', 'abdcfe', false], // two swaps
    ['abc', 'abcde', false], // length differs by 2
    ['', 'a', true],
    ['', '', false],
  ])('%s vs %s -> %s', (a, b, expected) => {
    expect(isOneEditApart(a, b)).toBe(expected);
    expect(isOneEditApart(b, a)).toBe(expected);
  });
});

describe('isTypo', () => {
  const unknown = () => false;

  it('forgives one slip in a long enough word', () => {
    expect(isTypo('bibliotca', 'biblioteca', 'es', unknown)).toBe(true);
    expect(isTypo('Bibliotca', 'biblioteca', 'es', unknown)).toBe(true);
  });

  it('never forgives short words', () => {
    expect('perro'.length).toBeLessThan(MIN_TYPO_LENGTH);
    expect(isTypo('pero', 'perro', 'es', unknown)).toBe(false);
    expect(isTypo('gatso', 'gatos', 'es', unknown)).toBe(false);
  });

  it('rejects an answer that is itself another known word', () => {
    const known = new Set(['trabajar']);
    expect(isTypo('trabajar', 'trabajos', 'es', w => known.has(w))).toBe(false);
    expect(isTypo('trabajoz', 'trabajos', 'es', w => known.has(w))).toBe(true);
  });

  it('compares the language-normalized forms, so accents are not counted as edits', () => {
    // "musca" folds to "musica" minus one letter: a single deletion, whether or not the accent is typed
    expect(isTypo('musca', 'música', 'es', unknown)).toBe(true);
    expect(isTypo('músca', 'música', 'es', unknown)).toBe(true);
  });
});
