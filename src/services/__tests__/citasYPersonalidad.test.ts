import { getLanguageInfo, getModule, getWordsForModule } from '../moduleService';

jest.mock('../logger');

const MODULE_ID = 'citas-y-personalidad';

describe('es/citas-y-personalidad module', () => {
  it('is registered in the Spanish language index and loadable', () => {
    const info = getLanguageInfo('es');
    expect(info?.modules.map(m => m.id)).toContain(MODULE_ID);
    expect(getModule('es', MODULE_ID)?.id).toBe(MODULE_ID);
  });

  it('has sequential module-prefixed ids and unique terms and definitions', () => {
    const words = getWordsForModule('es', MODULE_ID);
    expect(words.length).toBeGreaterThan(0);
    words.forEach((w, i) => expect(w.id).toBe(`${MODULE_ID}:${i + 1}`));
    expect(new Set(words.map(w => w.term)).size).toBe(words.length);
    // identical definitions make definition-to-term questions ambiguous
    expect(new Set(words.map(w => w.definition)).size).toBe(words.length);
  });

  it('has authored context with exactly one {BLANK} for every word', () => {
    for (const w of getWordsForModule('es', MODULE_ID)) {
      const ctx = w.context as { sentence: string; translation: string; sentenceWithBlank: string };
      expect(ctx.sentence).toBeTruthy();
      expect(ctx.translation).toBeTruthy();
      expect(ctx.sentenceWithBlank.split('{BLANK}')).toHaveLength(2);
    }
  });

  it('uses the same direction as the other Spanish modules', () => {
    for (const w of getWordsForModule('es', MODULE_ID)) {
      expect(w.direction).toBe('definition-to-term');
    }
  });
});
