import { getModulesForLanguage, getWordsForModule } from '../moduleService';
import { generateModuleScopedOptions } from '../optionGenerationUtils';
import { hasEquivalentTranslation } from '../translationUtils';
import { Module } from '../../store/types';
import { Word } from '../wordService';

jest.mock('../logger');
jest.mock('../moduleService', () => ({
  ...jest.requireActual('../moduleService'),
  getModulesForLanguage: jest.fn(),
  getWordsForModule: jest.fn(),
}));

describe('generateModuleScopedOptions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hasEquivalentTranslation', () => {
    it('does not split commas inside parenthetical grammar annotations', () => {
      const inDefinition = 'in (wisselvoorzetsel: datief=waar?, accusatief=waarheen?)';
      const aufDefinition = 'auf (wisselvoorzetsel: datief=waar?, accusatief=waarheen?)';

      expect(hasEquivalentTranslation(inDefinition, aufDefinition)).toBe(false);
      expect(hasEquivalentTranslation('de verkoudheid, verkoudheid', 'de verkoudheid')).toBe(true);
    });
  });

  it('excludes equivalent translations from module options and fallback candidates', () => {
    const target: Word = {
      id: 'target',
      term: 'die Erkältung',
      definition: 'de verkoudheid',
      direction: 'definition-to-term',
    };
    const moduleWords: Word[] = [
      target,
      { id: 'module-synonym', term: 'der Schnupfen', definition: 'de verkoudheid' },
      { id: 'arm', term: 'der Arm', definition: 'de arm' },
      { id: 'hand', term: 'die Hand', definition: 'de hand' },
    ];
    const allWords: Word[] = [
      ...moduleWords,
      { id: 'fallback-synonym', term: 'der Nasenkatarrh', definition: 'de verkoudheid' },
      { id: 'nose', term: 'die Nase', definition: 'de neus' },
      { id: 'ear', term: 'das Ohr', definition: 'het oor' },
    ];
    const module: Module = {
      id: 'test-module',
      name: 'Test',
      description: 'Test module',
      icon: '📚',
      difficulty: 'beginner',
      words: moduleWords,
    };

    jest.mocked(getModulesForLanguage).mockReturnValue([module]);
    jest.mocked(getWordsForModule).mockReturnValue(moduleWords);

    const options = generateModuleScopedOptions(target, 'de', allWords);

    expect(options).toHaveLength(4);
    expect(options).toContain('die Erkältung');
    expect(options).not.toContain('der Schnupfen');
    expect(options).not.toContain('der Nasenkatarrh');
  });

  it('keeps definitions with shared parenthetical commas as distinct distractors', () => {
    const target: Word = {
      id: 'in',
      term: 'in',
      definition: 'in (wisselvoorzetsel: datief=waar?, accusatief=waarheen?)',
      direction: 'definition-to-term',
    };
    const words: Word[] = [
      target,
      {
        id: 'auf',
        term: 'auf',
        definition: 'op (wisselvoorzetsel: datief=waar?, accusatief=waarheen?)',
      },
      {
        id: 'unter',
        term: 'unter',
        definition: 'onder (wisselvoorzetsel: datief=waar?, accusatief=waarheen?)',
      },
      { id: 'neben', term: 'neben', definition: 'naast' },
    ];
    const module: Module = {
      id: 'grammar-module',
      name: 'Grammar',
      description: 'Grammar terms',
      icon: '📚',
      difficulty: 'beginner',
      words,
    };

    jest.mocked(getModulesForLanguage).mockReturnValue([module]);
    jest.mocked(getWordsForModule).mockReturnValue(words);

    const options = generateModuleScopedOptions(target, 'de', words);

    expect(options).toEqual(expect.arrayContaining(['in', 'auf', 'unter', 'neben']));
  });

  it('keeps every option in the answer language in a mixed-direction module', () => {
    // Dutch-term words (term-to-definition) next to German-term words (definition-to-term)
    const dutchTerm = (id: string, term: string, definition: string): Word => ({
      id,
      term,
      definition,
      direction: 'term-to-definition',
      termLanguage: 'nl',
      definitionLanguage: 'de',
    });
    const germanTerm = (id: string, term: string, definition: string): Word => ({
      id,
      term,
      definition,
      direction: 'definition-to-term',
    });
    const words: Word[] = [
      dutchTerm('a', 'het balkon', 'der Balkon'),
      dutchTerm('b', 'de tuin', 'der Garten'),
      germanTerm('c', 'fertig', 'klaar'),
      germanTerm('d', 'damals', 'toen'),
      germanTerm('e', 'ziemlich', 'tamelijk'),
    ];
    const module: Module = {
      id: 'mixed',
      name: 'Mixed',
      description: 'Mixed',
      icon: '📚',
      difficulty: 'beginner',
      words,
    };
    jest.mocked(getModulesForLanguage).mockReturnValue([module]);
    jest.mocked(getWordsForModule).mockReturnValue(words);

    const germanAnswers = ['der Balkon', 'der Garten', 'fertig', 'damals', 'ziemlich'];
    const dutchAnswers = ['het balkon', 'de tuin', 'klaar', 'toen', 'tamelijk'];

    for (let run = 0; run < 25; run++) {
      // Asks Dutch -> German (term-to-definition on a Dutch-term word): every option is German
      const german = generateModuleScopedOptions(words[0], 'de', words);
      expect(german).toContain('der Balkon');
      german.forEach(option => expect(germanAnswers).toContain(option));
      // Asks Dutch -> German on a German-term word (definition-to-term): every option is German
      const german2 = generateModuleScopedOptions(words[2], 'de', words);
      german2.forEach(option => expect(germanAnswers).toContain(option));
      // Asks German -> Dutch (term-to-definition on a German-term word): every option is Dutch
      const dutch = generateModuleScopedOptions(
        { ...words[2], direction: 'term-to-definition' },
        'de',
        words
      );
      expect(dutch).toContain('klaar');
      dutch.forEach(option => expect(dutchAnswers).toContain(option));
    }
  });
});
