import type { Word } from './wordService';
import { getLanguageInfo } from './moduleService';

/**
 * Language (BCP 47) of the learning content on screen, for the `lang` attribute so screen
 * readers pick the right voice. The UI itself stays English.
 *
 * Default: `term` is in the course language (the `languageCode` the course is stored
 * under, e.g. `de`) and `definition` in the learner's own language (`from` in the course
 * `index.json`). A word whose fields are the other way round (the Dutch term / German
 * definition vocabulary) says so with `termLanguage` / `definitionLanguage` in its data.
 * Direction does not decide this: it only chooses which field is asked.
 */
const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  dutch: 'nl',
  german: 'de',
  spanish: 'es',
  english: 'en',
  french: 'fr',
  italian: 'it',
  portuguese: 'pt',
};

export interface ContentLanguages {
  term?: string;
  definition?: string;
}

export const getNativeLanguageCode = (languageCode: string): string | undefined => {
  const from = getLanguageInfo(languageCode)?.from;
  return from ? LANGUAGE_NAME_TO_CODE[from.trim().toLowerCase()] : undefined;
};

export const getContentLanguages = (
  languageCode: string | undefined,
  word?: Pick<Word, 'termLanguage' | 'definitionLanguage'> | null
): ContentLanguages => {
  const course = languageCode || undefined;
  return {
    term: word?.termLanguage ?? course,
    definition: word?.definitionLanguage ?? (course ? getNativeLanguageCode(course) : undefined),
  };
};

/** Language of `text` when it is the word's term or definition; undefined when it is neither. */
export const getLanguageOfText = (
  languageCode: string | undefined,
  word:
    | Pick<Word, 'term' | 'definition' | 'termLanguage' | 'definitionLanguage'>
    | null
    | undefined,
  text: string
): string | undefined => {
  if (!word) return undefined;
  const langs = getContentLanguages(languageCode, word);
  if (text === word.term) return langs.term;
  if (text === word.definition) return langs.definition;
  return undefined;
};
