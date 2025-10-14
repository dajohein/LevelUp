import { store } from '../../store/store';
import { 
  incrementWordsCompleted, 
  addCorrectAnswer, 
  addIncorrectAnswer,
  completeSession
} from '../../store/sessionSlice';
import {
  setCurrentWord,
  nextWord
} from '../../store/gameSlice';
import { challengeServiceManager } from '../challengeServiceManager';

export interface SessionContext {
  languageCode: string;
  wordsCompleted: number;
  currentStreak: number;
  timeRemaining: number;
  targetWords: number;
  wordProgress: any;
}

export interface SessionBonuses {
  timeBonus: number;
  streakBonus: number;
  contextBonus: number;
  perfectRecallBonus: number;
}

export interface SessionCompletionResult {
  isComplete: boolean;
  shouldNavigate?: boolean;
  navigationPath?: string;
  bonuses?: SessionBonuses;
}

/**
 * Manages game session lifecycle, progression, and scoring logic.
 * Extracted from Game.tsx to improve maintainability and testability.
 */
export class GameSessionManager {
  private dispatch = store.dispatch;

  /**
   * Handle answer submission and session progression
   */
  async handleAnswerSubmission(
    isCorrect: boolean,
    currentSession: any,
    isSessionActive: boolean,
    sessionTimer: number,
    sessionProgress: any,
    wordProgress: any,
    languageCode: string,
    isUsingSpacedRepetition: boolean,
    gameLanguage?: string
  ): Promise<SessionCompletionResult> {
    // Update session counter if answer was correct and we're in a session
    if (isCorrect && isSessionActive && currentSession) {
      this.dispatch(incrementWordsCompleted());
      
      // Calculate session-specific bonuses
      const bonuses = this.calculateSessionBonuses(currentSession, sessionTimer, sessionProgress);
      
      this.dispatch(addCorrectAnswer(bonuses));
      
      return { 
        isComplete: false, 
        bonuses 
      };
    }

    // Handle incorrect answers for session tracking
    if (!isCorrect && isSessionActive) {
      this.dispatch(addIncorrectAnswer());
    }

    return { isComplete: false };
  }

  /**
   * Calculate session-specific bonuses based on performance
   */
  private calculateSessionBonuses(
    currentSession: any,
    sessionTimer: number,
    sessionProgress: any
  ): SessionBonuses {
    const bonuses: SessionBonuses = {
      timeBonus: 0,
      streakBonus: 0,
      contextBonus: 0,
      perfectRecallBonus: 0,
    };

    // Session-specific bonus calculations
    if (currentSession.id === 'quick-dash') {
      // Speed bonus up to 50 points per word (based on time remaining)
      const timeRemaining = Math.max(0, (currentSession.timeLimit! * 60) - sessionTimer);
      bonuses.timeBonus = Math.min(50, Math.floor(timeRemaining / 6)); // Up to 50 points
    } else if (currentSession.id === 'deep-dive') {
      // Context bonus +30 points for deep learning
      bonuses.contextBonus = 30;
    } else if (currentSession.id === 'precision-mode') {
      // Perfect recall bonus +40 points for accuracy focus
      bonuses.perfectRecallBonus = 40;
    } else if (currentSession.id === 'streak-challenge') {
      // Streak bonus based on current streak (up to 100 points)
      bonuses.streakBonus = Math.min(100, sessionProgress.currentStreak * 5);
    } else if (currentSession.id === 'boss-battle') {
      // Damage bonus +25 points for each hit
      bonuses.contextBonus = 25;
    }

    return bonuses;
  }

  /**
   * Handle enhanced learning session completion
   */
  handleEnhancedSessionCompletion(
    result: any,
    gameLanguage?: string,
    languageCode?: string
  ): SessionCompletionResult {
    if (result && typeof result === 'object' && 'isComplete' in result && result.isComplete) {
      // Session completed - show recommendations and analytics
      const actualLanguageCode = gameLanguage || languageCode;
      
      // Complete the session in Redux store
      this.dispatch(completeSession());
      
      return {
        isComplete: true,
        shouldNavigate: true,
        navigationPath: `/completed/${actualLanguageCode}`
      };
    }

    return { isComplete: false };
  }

  /**
   * Handle word progression using challenge service manager
   */
  async handleWordProgression(
    currentSession: any,
    sessionTimer: number,
    sessionProgress: any,
    wordProgress: any,
    languageCode: string,
    isUsingSpacedRepetition: boolean
  ): Promise<void> {
    try {
      // Use unified challenge service manager for all special modes
      if (currentSession?.id && challengeServiceManager.isSessionTypeSupported(currentSession.id) && !isUsingSpacedRepetition) {
        const timeRemaining = Math.max(0, (currentSession.timeLimit! * 60) - sessionTimer);
        
        const context: SessionContext = {
          wordsCompleted: sessionProgress.wordsCompleted,
          currentStreak: sessionProgress.currentStreak,
          timeRemaining,
          targetWords: currentSession.targetWords || 15,
          wordProgress,
          languageCode
        };

        // Non-blocking async call
        const result = await challengeServiceManager.getNextWord(currentSession.id, context);
        
        // Only update if component is still mounted and session hasn't changed
        if (result.word) {
          this.dispatch(setCurrentWord({
            word: result.word,
            options: result.options,
            quizMode: result.quizMode,
          }));
        }
      } else {
        this.dispatch(nextWord());
      }
    } catch (error) {
      console.error(`Failed to get next word from ${currentSession?.id} service:`, error);
      // Fallback only if we're still in the same session
      this.dispatch(nextWord());
    }
  }

  /**
   * Initialize session with challenge service manager
   */
  async initializeSession(
    currentSession: any,
    languageCode: string,
    wordProgress: any,
    sessionProgress: any
  ): Promise<boolean> {
    try {
      // Initialize challenge services for special modes using unified service manager
      if (currentSession?.id && challengeServiceManager.isSessionTypeSupported(currentSession.id)) {
        const config = {
          difficulty: currentSession.difficulty || 'intermediate',
          timeLimit: currentSession.timeLimit || 15,
          targetWords: currentSession.targetWords || 15,
        };

        await challengeServiceManager.initializeSession(currentSession.id, languageCode, wordProgress, config);

        // Get first word using unified service manager
        const context: SessionContext = {
          wordsCompleted: sessionProgress.wordsCompleted,
          currentStreak: sessionProgress.currentStreak,
          timeRemaining: (currentSession.timeLimit || 15) * 60,
          targetWords: currentSession.targetWords || 15,
          wordProgress,
          languageCode
        };

        const result = await challengeServiceManager.getNextWord(currentSession.id, context);
        
        if (result.word) {
          this.dispatch(setCurrentWord({
            word: result.word,
            options: result.options,
            quizMode: result.quizMode,
          }));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to initialize ${currentSession?.id} service:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const gameSessionManager = new GameSessionManager();