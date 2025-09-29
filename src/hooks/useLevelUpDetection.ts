import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import type { WordProgress } from '../store/types';
import { calculateLanguageXP, calculateCurrentLevel, checkLanguageLevelUp } from '../services/levelService';

interface LevelUpState {
  showLevelUp: boolean;
  oldLevel: number;
  newLevel: number;
  totalXP: number;
}

export const useLevelUpDetection = () => {
  const { wordProgress, language } = useSelector((state: RootState) => state.game);
  const [levelUpState, setLevelUpState] = useState<LevelUpState>({
    showLevelUp: false,
    oldLevel: 0,
    newLevel: 0,
    totalXP: 0,
  });
  const previousProgressRef = useRef<Record<string, WordProgress>>({});

  useEffect(() => {
    if (!language) return;

    const currentProgress = { ...wordProgress };
    const previousProgress = previousProgressRef.current;
    
    // Only check for level up if we have previous progress and progress has changed
    if (Object.keys(previousProgress).length > 0) {
      const hasLeveledUp = checkLanguageLevelUp(previousProgress, currentProgress, language);
      
      if (hasLeveledUp) {
        const oldXP = calculateLanguageXP(previousProgress, language);
        const newXP = calculateLanguageXP(currentProgress, language);
        const oldLevel = calculateCurrentLevel(oldXP);
        const newLevel = calculateCurrentLevel(newXP);
        
        setLevelUpState({
          showLevelUp: true,
          oldLevel,
          newLevel,
          totalXP: newXP,
        });
      }
    }
    
    // Update previous progress reference
    previousProgressRef.current = currentProgress;
  }, [wordProgress, language]);

  const closeLevelUp = () => {
    setLevelUpState(prev => ({ ...prev, showLevelUp: false }));
  };

  return {
    ...levelUpState,
    closeLevelUp,
  };
};