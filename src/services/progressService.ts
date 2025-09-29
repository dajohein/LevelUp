import { getWordsForModule, getAvailableLanguages } from './moduleService';
import { wordProgressStorage } from './storageService';
import { calculateMasteryDecay } from './masteryService';

export interface LanguageProgress {
  totalWords: number;
  practicedWords: number;
  averageMastery: number;
  completedModules: number;
  totalModules: number;
  lastPracticed?: string;
  recentActivity: boolean; // Practiced in last 7 days
}

export const calculateLanguageProgress = (languageCode: string): LanguageProgress => {
  const languages = getAvailableLanguages();
  const language = languages.find(l => l.code === languageCode);
  
  if (!language) {
    return {
      totalWords: 0,
      practicedWords: 0,
      averageMastery: 0,
      completedModules: 0,
      totalModules: 0,
      recentActivity: false
    };
  }

  // Get word progress for this language
  const wordProgress = wordProgressStorage.load(languageCode);
  
  let totalWords = 0;
  let practicedWords = 0;
  let totalMastery = 0;
  let completedModules = 0;
  let lastPracticedTimestamp: number | null = null;

  // Calculate progress for each module
  language.info.modules.forEach(module => {
    const moduleWords = getWordsForModule(languageCode, module.id);
    totalWords += moduleWords.length;

    let modulePracticedWords = 0;
    let moduleTotalMastery = 0;

    moduleWords.forEach(word => {
      const progress = wordProgress[word.id];
      if (progress) {
        practicedWords++;
        modulePracticedWords++;
        
        // Calculate current mastery with decay
        const currentMastery = calculateMasteryDecay(progress.lastPracticed, progress.xp || 0);
        totalMastery += currentMastery;
        moduleTotalMastery += currentMastery;

        // Track most recent practice
        const practiceTime = new Date(progress.lastPracticed).getTime();
        if (lastPracticedTimestamp === null || practiceTime > lastPracticedTimestamp) {
          lastPracticedTimestamp = practiceTime;
        }
      }
    });

    // Consider module completed if 80% of words are at 70% mastery or higher
    if (moduleWords.length > 0) {
      const moduleAverageMastery = modulePracticedWords > 0 ? moduleTotalMastery / modulePracticedWords : 0;
      const practiceRatio = modulePracticedWords / moduleWords.length;
      
      if (practiceRatio >= 0.8 && moduleAverageMastery >= 70) {
        completedModules++;
      }
    }
  });

  const averageMastery = practicedWords > 0 ? totalMastery / practicedWords : 0;
  
  // Check recent activity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  let recentActivity = false;
  let lastPracticedString: string | undefined = undefined;
  
  if (lastPracticedTimestamp) {
    const lastPracticedDate = new Date(lastPracticedTimestamp);
    recentActivity = lastPracticedDate > sevenDaysAgo;
    lastPracticedString = lastPracticedDate.toISOString();
  }

  return {
    totalWords,
    practicedWords,
    averageMastery,
    completedModules,
    totalModules: language.info.modules.length,
    lastPracticed: lastPracticedString,
    recentActivity
  };
};

export const getAllLanguageProgress = (): { [key: string]: LanguageProgress } => {
  const languages = getAvailableLanguages();
  const progress: { [key: string]: LanguageProgress } = {};
  
  languages.forEach(({ code }) => {
    progress[code] = calculateLanguageProgress(code);
  });
  
  return progress;
};