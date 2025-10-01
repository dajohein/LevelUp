import type { Module, LanguageInfo, WordProgress } from '../store/types';
import type { Word } from './wordService';
import { logger } from './logger';

// Import language info files
import deLanguageInfo from '../data/de/index.json';
import esLanguageInfo from '../data/es/index.json';

// Import module files
import deGrundwortschatz from '../data/de/grundwortschatz.json';
import esVocabularioBasico from '../data/es/vocabulario-basico.json';

// Available languages registry
export const availableLanguages = {
  de: deLanguageInfo,
  es: esLanguageInfo,
} as const;

// Module registry for dynamic imports
const moduleRegistry: Record<string, Record<string, any>> = {
  de: {
    grundwortschatz: deGrundwortschatz,
  },
  es: {
    'vocabulario-basico': esVocabularioBasico,
  },
};

export const getAvailableLanguages = (): Array<{ code: string; info: LanguageInfo }> => {
  return Object.entries(availableLanguages).map(([code, info]) => ({
    code,
    info: info as LanguageInfo,
  }));
};

export const getLanguageInfo = (languageCode: string): LanguageInfo | null => {
  return (
    (availableLanguages[languageCode as keyof typeof availableLanguages] as LanguageInfo) || null
  );
};

export const getModule = (languageCode: string, moduleId: string): Module | null => {
  const moduleData = moduleRegistry[languageCode]?.[moduleId];
  if (!moduleData) {
    logger.warn(`Module ${moduleId} not found for language ${languageCode}`);
    return null;
  }
  return moduleData as Module;
};

export const getModulesForLanguage = (languageCode: string): Module[] => {
  const languageInfo = getLanguageInfo(languageCode);
  if (!languageInfo) return [];

  const modules: Module[] = [];

  for (const moduleInfo of languageInfo.modules) {
    const module = getModule(languageCode, moduleInfo.id);
    if (module) {
      modules.push(module);
    }
  }

  return modules;
};

export const getWordsForModule = (languageCode: string, moduleId: string): Word[] => {
  const module = getModule(languageCode, moduleId);
  return module?.words || [];
};

export const getModuleStats = (
  languageCode: string,
  moduleId: string,
  wordProgress: Record<string, WordProgress> = {}
): {
  totalWords: number;
  completedWords: number;
  averageMastery: number;
  wordsLearned: number;
  completionPercentage: number;
} => {
  const words = getWordsForModule(languageCode, moduleId);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      totalWords: 0,
      completedWords: 0,
      averageMastery: 0,
      wordsLearned: 0,
      completionPercentage: 0,
    };
  }

  let completedWords = 0;
  let wordsWithProgress = 0;
  let totalMastery = 0;

  words.forEach(word => {
    const progress = wordProgress[word.id];
    if (progress) {
      const mastery = progress.xp || 0;
      totalMastery += mastery;

      if (mastery > 0) {
        wordsWithProgress++;
      }

      // Consider a word "completed" if it has been practiced and has some XP
      // Lowered threshold from 50 to 20 to be more realistic
      if (mastery >= 20) {
        completedWords++;
      }
    }
  });

  const averageMastery = Math.round(totalMastery / totalWords);
  const practicePercentage = Math.round((wordsWithProgress / totalWords) * 100);

  return {
    totalWords,
    completedWords,
    averageMastery,
    wordsLearned: wordsWithProgress, // Changed to use wordsWithProgress instead of completedWords
    completionPercentage: practicePercentage, // Use practice percentage for more realistic progress
  };
};
