import type { Module, LanguageInfo, WordProgress } from '../store/types';
import type { Word } from './wordService';
import { logger } from './logger';
import { DataIntegrityError } from '../utils/errorHandling';

// Import language info files
import deLanguageInfo from '../data/de/index.json';
import esLanguageInfo from '../data/es/index.json';

// Import module files
import deGrundwortschatz from '../data/de/grundwortschatz.json';
import deGrammatikGrundlagen from '../data/de/grammatik-grundlagen.json';
import deGrammatikHerhaling from '../data/de/grammatik-herhaling.json';
import deNiederlandischDeutschVokabeln from '../data/de/niederlandisch-deutsch-vokabeln.json';
import esVocabularioBasico from '../data/es/vocabulario-basico.json';
import esFrasesClave from '../data/es/frases-clave.json';
import esComidaYBebidas from '../data/es/comida-y-bebidas.json';
import esRestauranteYSabores from '../data/es/restaurante-y-sabores.json';

// Available languages registry (restored for browser compatibility)
export const availableLanguages = {
  de: deLanguageInfo,
  es: esLanguageInfo,
} as const;

// Module registry for static imports (restored for browser compatibility)
const moduleRegistry: Record<string, Record<string, any>> = {
  de: {
    grundwortschatz: deGrundwortschatz,
    'grammatik-grundlagen': deGrammatikGrundlagen,
    'grammatik-herhaling': deGrammatikHerhaling,
    'niederlandisch-deutsch-vokabeln': deNiederlandischDeutschVokabeln,
  },
  es: {
    'vocabulario-basico': esVocabularioBasico,
    'frases-clave': esFrasesClave,
    'comida-y-bebidas': esComidaYBebidas,
    'restaurante-y-sabores': esRestauranteYSabores,
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
    const dataError = new DataIntegrityError(
      `Module ${moduleId} not found for language ${languageCode}`,
      { languageCode, moduleId }
    );
    logger.warn(dataError.message, dataError.context);
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

  // Reduced debug logging for performance - only log when requested
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    console.log(`🔍 getModuleStats for ${moduleId}:`, {
      totalWords,
      wordsWithProgress: `${words.filter(word => wordProgress[word.id]?.xp > 0).length}/${totalWords}`,
      wordProgressKeys: Object.keys(wordProgress).length,
      sampleModuleWordIDs: words.slice(0, 3).map(w => w.id),
    });
  }

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

  // Reduced debug logging for performance - only log occasionally
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    console.log(`📊 Stats calculation for ${moduleId}:`, {
      wordsWithProgress,
      totalWords,
      practicePercentage,
      completedWords,
      averageMastery,
    });
  }

  return {
    totalWords,
    completedWords,
    averageMastery,
    wordsLearned: wordsWithProgress, // Changed to use wordsWithProgress instead of completedWords
    completionPercentage: practicePercentage, // Use practice percentage for more realistic progress
  };
};
