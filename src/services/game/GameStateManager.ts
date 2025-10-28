import { store } from '../../store/store';
import { resetGame, setLanguage, setCurrentModule } from '../../store/gameSlice';
import { resetSession } from '../../store/sessionSlice';

export interface GameStateSnapshot {
  currentWord: any;
  quizMode: string;
  sessionTimer: number;
  wordTimer: number;
  isTransitioning: boolean;
  lastAnswerCorrect: boolean | null;
  sessionCompleted: boolean;
  inputValue: string;
}

export interface GameInitializationOptions {
  languageCode: string;
  moduleId?: string;
  sessionType?: string;
  difficulty?: string;
  resetPrevious?: boolean;
}

/**
 * Manages overall game state coordination and lifecycle.
 * Extracted from Game.tsx to improve state management clarity.
 */
export class GameStateManager {
  private dispatch = store.dispatch;

  /**
   * Initialize game state for a new session
   */
  initializeGame(options: GameInitializationOptions): void {
    const { languageCode, moduleId, /* sessionType, */ resetPrevious = true } = options; // Removed unused destructured variable

    if (resetPrevious) {
      // Reset previous game state
      this.dispatch(resetGame());
      this.dispatch(resetSession());
    }

    // Set language and module
    this.dispatch(setLanguage(languageCode));
    if (moduleId) {
      this.dispatch(setCurrentModule(moduleId));
    }
  }

  /**
   * Create a snapshot of current game state for debugging/analytics
   */
  createStateSnapshot(
    currentWord: any,
    quizMode: string,
    sessionTimer: number,
    wordTimer: number,
    isTransitioning: boolean,
    lastAnswerCorrect: boolean | null,
    sessionCompleted: boolean,
    inputValue: string
  ): GameStateSnapshot {
    return {
      currentWord,
      quizMode,
      sessionTimer,
      wordTimer,
      isTransitioning,
      lastAnswerCorrect,
      sessionCompleted,
      inputValue
    };
  }

  /**
   * Validate game state consistency
   */
  validateGameState(state: GameStateSnapshot): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for required state
    if (!state.currentWord) {
      errors.push('No current word available');
    }

    if (!state.quizMode) {
      errors.push('No quiz mode set');
    }

    // Check for potential issues
    if (state.sessionTimer > 3600) { // 1 hour
      warnings.push('Session running for over 1 hour');
    }

    if (state.wordTimer > 300) { // 5 minutes
      warnings.push('Word timer exceeds 5 minutes - user may be stuck');
    }

    if (state.isTransitioning && state.inputValue) {
      warnings.push('Input value present during transition state');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Handle game pause/resume logic
   */
  pauseGame(): GameStateSnapshot | null {
    // Could implement pause logic here
    // For now, just return current state for preservation
    const state = store.getState();
    
    return {
      currentWord: state.game.currentWord,
      quizMode: state.game.quizMode,
      sessionTimer: 0, // Would need to calculate from session start
      wordTimer: 0,    // Would need to calculate from word start
      isTransitioning: false,
      lastAnswerCorrect: null,
      sessionCompleted: false,
      inputValue: ''
    };
  }

  /**
   * Resume game from saved state
   */
  resumeGame(snapshot: GameStateSnapshot): void {
    // Implementation would restore state from snapshot
    // This is a placeholder for future pause/resume functionality
    console.log('Resuming game from snapshot:', snapshot);
  }

  /**
   * Get current game context for service calls
   */
  getCurrentGameContext(): {
    languageCode: string | null;
    moduleId: string | null;
    sessionActive: boolean;
    currentWord: any;
    quizMode: string;
  } {
    const state = store.getState();
    
    return {
      languageCode: state.game.language,
      moduleId: state.game.module,
      sessionActive: state.session.isSessionActive,
      currentWord: state.game.currentWord,
      quizMode: state.game.quizMode
    };
  }

  /**
   * Clean up game state on component unmount
   */
  cleanupGameState(): void {
    // Reset transient state that shouldn't persist
    // Keep progress and session data intact
    const state = store.getState();
    
    if (state.session.isSessionActive) {
      // If session is active, preserve it
      console.log('Game component unmounting but session is active - preserving state');
    } else {
      // Clean up completed/inactive sessions
      this.dispatch(resetSession());
    }
  }

  /**
   * Handle navigation away from game
   */
  handleGameNavigation(): {
    shouldSaveState: boolean;
    shouldWarnUser: boolean;
    warningMessage?: string;
  } {
    const state = store.getState();
    const isSessionActive = state.session.isSessionActive;
    const hasProgress = state.session.progress.wordsCompleted > 0;

    if (isSessionActive && hasProgress) {
      return {
        shouldSaveState: true,
        shouldWarnUser: true,
        warningMessage: 'You have an active session. Your progress will be saved, but you may lose your current streak.'
      };
    }

    return {
      shouldSaveState: false,
      shouldWarnUser: false
    };
  }

  /**
   * Update game timing state
   */
  updateTimingState(sessionElapsed: number, wordElapsed: number): void {
    // This would update timing in Redux store
    // Currently handled by component state, but could be moved to Redux
    console.log(`Session time: ${sessionElapsed}s, Word time: ${wordElapsed}s`);
  }

  /**
   * Check if game is in a stable state for background operations
   */
  isGameStable(): boolean {
    const state = store.getState();
    
    // Game is stable if:
    // - Has current word
    // - Not transitioning
    // - Session is properly initialized
    return !!(
      state.game.currentWord &&
      state.session.isSessionActive &&
      // Would need isTransitioning in Redux to check this properly
      true // Placeholder
    );
  }
}

// Export singleton instance
export const gameStateManager = new GameStateManager();