import { getModulesForLanguage, getWordsForModule } from '../moduleService';
import { generateModuleScopedOptions } from '../optionGenerationUtils';
import { Module } from '../../store/types';
import { Word } from '../wordService';

jest.mock('../logger');
jest.mock('../moduleService', () => ({
  getModulesForLanguage: jest.fn(),
  getWordsForModule: jest.fn(),
}));

describe('generateModuleScopedOptions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
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
});
