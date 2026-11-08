import { getLanguageInfo, getModule, getModulesForLanguage } from '../moduleService';

describe('German Gesundheit module', () => {
  const module = getModule('de', 'gesundheit');

  it('is registered only in German and contains all 101 source entries', () => {
    expect(module).not.toBeNull();
    expect(module?.words).toHaveLength(101);
    expect(getLanguageInfo('de')?.modules.map(({ id }) => id)).toContain('gesundheit');
    expect(getLanguageInfo('es')?.modules.map(({ id }) => id)).not.toContain('gesundheit');
    expect(getModule('es', 'gesundheit')).toBeNull();
    expect(getModulesForLanguage('de').map(({ id }) => id)).toContain('gesundheit');
  });

  it('preserves source categories, order, and quiz directions', () => {
    expect(module?.words.map(({ id }) => id)).toEqual(
      Array.from({ length: 101 }, (_, index) => `gesundheit:${index + 1}`)
    );
    expect(
      module?.words.reduce<Record<string, number>>((counts, word) => {
        counts[word.category ?? ''] = (counts[word.category ?? ''] ?? 0) + 1;
        return counts;
      }, {})
    ).toEqual({
      Wortschatz: 56,
      Wiederholung: 15,
      Sehen: 8,
      Hören: 5,
      Lesen: 17,
    });
    expect(
      module?.words.slice(0, 71).every(({ direction }) => direction === 'definition-to-term')
    ).toBe(true);
    expect(
      module?.words.slice(71).every(({ direction }) => direction === 'term-to-definition')
    ).toBe(true);
    expect(module?.words[75].term).toBe('fast');
    expect(module?.words[96].term).toBe('fast');
  });

  it('provides complete Dutch definitions and usable German fill-in context', () => {
    module?.words.forEach(word => {
      expect(word.definition.trim()).not.toBe('');
      expect(word.context?.sentence.trim()).not.toBe('');
      expect(word.context?.translation.trim()).not.toBe('');
      expect(word.context?.sentenceWithBlank?.match(/\{BLANK\}/g)).toHaveLength(1);
    });
    expect(module?.words[0].forms).toContain('die Arme');
    expect(module?.words[67].term).toBe('letzte Woche');
    expect(module?.words[67].definition).toBe('vorige week');
  });
});
