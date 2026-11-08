import { dataTransferService } from '../dataTransferService';
import { wordProgressStorage } from '../storageService';
import type { WordProgress } from '../../store/types';

jest.mock('../moduleService', () => ({
  getAvailableLanguages: () => [
    { code: 'de', info: { name: 'German' } },
    { code: 'es', info: { name: 'Spanish' } },
  ],
}));
jest.mock('../progressService', () => ({
  getAllLanguageProgress: () => ({}),
}));

const germanProgress: Record<string, WordProgress> = {
  'de-word': {
    wordId: 'de-word',
    xp: 10,
    lastPracticed: '2026-11-08T00:00:00.000Z',
    timesCorrect: 2,
    timesIncorrect: 0,
  },
};
const spanishProgress: Record<string, WordProgress> = {
  'es-word': {
    wordId: 'es-word',
    xp: 20,
    lastPracticed: '2026-11-08T00:00:00.000Z',
    timesCorrect: 4,
    timesIncorrect: 1,
  },
};

function makeImportFile(data: unknown): File {
  const file = new File([JSON.stringify(data)], 'levelup-progress.json', {
    type: 'application/json',
  });
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(data) });
  return file;
}

describe('data transfer language isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips German and Spanish progress and leaves unselected languages untouched', async () => {
    wordProgressStorage.save('de', germanProgress);
    wordProgressStorage.save('es', spanishProgress);

    const exported = dataTransferService.exportAllData();
    expect(exported.wordProgress).toMatchObject({
      de: germanProgress,
      es: spanishProgress,
    });

    wordProgressStorage.clear();
    const importFile = makeImportFile(exported);
    const result = await dataTransferService.importData(importFile, {
      selectedLanguages: ['de', 'es'],
      mergeWithExisting: false,
    });

    expect(result.success).toBe(true);
    expect(wordProgressStorage.load('de')).toEqual(germanProgress);
    expect(wordProgressStorage.load('es')).toEqual(spanishProgress);

    const spanishBeforeGermanOnlyImport = {
      'es-existing': { ...spanishProgress['es-word'], wordId: 'es-existing' },
    };
    wordProgressStorage.save('es', spanishBeforeGermanOnlyImport);
    const germanOnlyResult = await dataTransferService.importData(importFile, {
      selectedLanguages: ['de'],
      mergeWithExisting: false,
    });

    expect(germanOnlyResult.importedLanguages).toEqual(['de']);
    expect(wordProgressStorage.load('de')).toEqual(germanProgress);
    expect(wordProgressStorage.load('es')).toEqual(spanishBeforeGermanOnlyImport);
  });
});
