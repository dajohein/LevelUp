// Debug helpers for development
import { wordProgressStorage } from '../services/storageService';
import type { WordProgress } from '../store/types';

// Create sample word progress data for testing
export const createSampleData = () => {
  const sampleSpanishData: { [key: string]: WordProgress } = {
    'es_basic_hola': {
      wordId: 'es_basic_hola',
      xp: 150,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 8,
      timesIncorrect: 2
    },
    'es_basic_adios': {
      wordId: 'es_basic_adios',
      xp: 120,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 7,
      timesIncorrect: 1
    },
    'es_basic_gracias': {
      wordId: 'es_basic_gracias',
      xp: 200,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 13,
      timesIncorrect: 2
    }
  };

  const sampleGermanData: { [key: string]: WordProgress } = {
    'de_basic_hallo': {
      wordId: 'de_basic_hallo',
      xp: 100,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 4,
      timesIncorrect: 1
    },
    'de_basic_tschuss': {
      wordId: 'de_basic_tschuss',
      xp: 80,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 3,
      timesIncorrect: 1
    }
  };

  try {
    wordProgressStorage.save('es', sampleSpanishData);
    wordProgressStorage.save('de', sampleGermanData);
    
    console.log('✅ Sample data created successfully!');
    console.log('Spanish words:', Object.keys(sampleSpanishData).length);
    console.log('German words:', Object.keys(sampleGermanData).length);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create sample data:', error);
    return false;
  }
};

// Check what's currently in storage
export const debugStorage = () => {
  try {
    const allData = wordProgressStorage.loadAll();
    console.log('🔍 All localStorage data:', allData);
    
    const spanishData = wordProgressStorage.load('es');
    console.log('🇪🇸 Spanish data:', spanishData);
    
    const germanData = wordProgressStorage.load('de');
    console.log('🇩🇪 German data:', germanData);
    
    // Check localStorage directly
    const rawData = localStorage.getItem('levelup_word_progress');
    console.log('📦 Raw localStorage:', rawData);
    
    return { allData, spanishData, germanData, rawData };
  } catch (error) {
    console.error('❌ Error debugging storage:', error);
    return null;
  }
};

// Clear all data
export const clearAllData = () => {
  try {
    localStorage.removeItem('levelup_word_progress');
    localStorage.removeItem('levelup_game_state');
    localStorage.removeItem('levelup_session_state');
    console.log('🗑️ All data cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    return false;
  }
};

// Make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugLevelUp = {
    createSampleData,
    debugStorage,
    clearAllData
  };
  
  console.log('🛠️ Debug helpers available: window.debugLevelUp');
  console.log('   - createSampleData(): Create sample progress data');
  console.log('   - debugStorage(): Check current storage state');
  console.log('   - clearAllData(): Clear all stored data');
}