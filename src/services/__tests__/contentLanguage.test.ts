import { getContentLanguages, getLanguageOfText, getNativeLanguageCode } from '../contentLanguage';
import { getModule } from '../moduleService';
import type { Word } from '../wordService';

const word = (over: Partial<Word> = {}): Word => ({
  id: 'w',
  term: 'der Hund',
  definition: 'de hond',
  ...over,
});

describe('content language', () => {
  it('maps the learner language name of each course to a code', () => {
    expect(getNativeLanguageCode('de')).toBe('nl');
    expect(getNativeLanguageCode('es')).toBe('nl');
    expect(getNativeLanguageCode('xx')).toBeUndefined();
  });

  it.each([
    ['de', 'de', 'nl'],
    ['es', 'es', 'nl'],
  ])('%s: term is the course language, definition the learner language', (code, term, def) => {
    expect(getContentLanguages(code, word())).toEqual({ term, definition: def });
  });

  it('does not depend on direction (both directions give the same field languages)', () => {
    const a = getContentLanguages('de', word({ direction: 'term-to-definition' }));
    const b = getContentLanguages('de', word({ direction: 'definition-to-term' }));
    expect(a).toEqual(b);
  });

  it('word data overrides the defaults (Dutch term / German definition)', () => {
    const w = word({
      term: 'het huis',
      definition: 'das Haus',
      termLanguage: 'nl',
      definitionLanguage: 'de',
    });
    expect(getContentLanguages('de', w)).toEqual({ term: 'nl', definition: 'de' });
    expect(getLanguageOfText('de', w, 'het huis')).toBe('nl');
    expect(getLanguageOfText('de', w, 'das Haus')).toBe('de');
  });

  it('returns no language rather than guessing when it is unknown', () => {
    expect(getContentLanguages(undefined, word())).toEqual({
      term: undefined,
      definition: undefined,
    });
    expect(getLanguageOfText('de', word(), 'something else')).toBeUndefined();
    expect(getLanguageOfText('de', null, 'x')).toBeUndefined();
  });

  it('the real Dutch-German module marks every Dutch-term word', () => {
    const mod = getModule('de', 'niederlandisch-deutsch-vokabeln');
    const swapped = (mod?.words ?? []).filter(w => w.direction === 'term-to-definition');
    expect(swapped.length).toBeGreaterThan(0);
    swapped.forEach(w =>
      expect(getContentLanguages('de', w)).toEqual({ term: 'nl', definition: 'de' })
    );
    const normal = (mod?.words ?? []).filter(w => w.direction !== 'term-to-definition');
    normal.forEach(w =>
      expect(getContentLanguages('de', w)).toEqual({ term: 'de', definition: 'nl' })
    );
  });
});
