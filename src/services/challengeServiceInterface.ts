/**
 * Generic Challenge Service Interface
 * 
 * Defines the standard interface that ALL challenge services must implement
 * to enable unified service management and eliminate code duplication.
 */

import { Word } from './wordService';
import { WordProgress } from '../store/types';

// Standard quiz modes supported by Redux store
export type StandardQuizMode = 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';

// Generic configuration for challenge initialization
export interface ChallengeConfig {
  languageCode: string;
  wordProgress: { [key: string]: WordProgress };
  targetWords?: number;
  timeLimit?: number;
  difficulty?: number;
  allWords?: Word[];
}

// Generic context for getting next word
export interface ChallengeContext {
  wordsCompleted: number;
  currentStreak: number;
  timeRemaining?: number;
  targetWords: number;
  allWords?: Word[];
  wordProgress: { [key: string]: WordProgress };
  languageCode: string; // Language for module-specific word selection
  moduleId?: string; // Optional module ID for module-specific practice
}

// Standardized result from any challenge service
export interface ChallengeResult {
  word: Word | null;
  options: string[];
  quizMode: StandardQuizMode;
  aiEnhanced?: boolean;
  metadata?: {
    reasoning?: string[];
    confidenceBoost?: string[];
    errorPreventionHints?: string[];
    optimalPacing?: number;
    difficulty?: number;
    bossPhase?: string;
    originalQuizMode?: string; // Preserve the original mode for UI display
    enhancementLevel?: 'standard' | 'advanced'; // Indicate if this is an enhanced question
  };
}

// Standard completion result
export interface CompletionResult {
  sessionContinues: boolean;
  sessionFailed?: boolean;
  sessionCompleted?: boolean;
}

/**
 * Generic Challenge Service Interface
 * 
 * ALL challenge services must implement this interface to be used
 * by the unified ChallengeServiceManager.
 */
export interface IChallengeService {
  /**
   * Initialize the challenge service with configuration
   */
  initialize(config: ChallengeConfig): Promise<void> | void;

  /**
   * Get the next word for the challenge
   */
  getNextWord(context: ChallengeContext): Promise<ChallengeResult>;

  /**
   * Record the completion of a word
   */
  recordCompletion(
    wordId: string,
    correct: boolean,
    timeSpent: number,
    metadata?: { errorType?: string; wasAIEnhanced?: boolean }
  ): Promise<CompletionResult> | CompletionResult | boolean;

  /**
   * Reset the service state
   */
  reset(): void;

  /**
   * Get current session state (optional)
   */
  getSessionState?(): any;

  /**
   * Check if session has failed (optional)
   */
  hasSessionFailed?(): boolean;
}

/**
 * Service registry type for mapping session IDs to services
 */
export type ServiceRegistry = {
  [sessionId: string]: IChallengeService;
};