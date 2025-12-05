// Game Business Logic Services
// Extracted from Game.tsx for better maintainability and testability

// Import singletons first
import { gameSessionManager } from './GameSessionManager';
import { gameProgressTracker } from './GameProgressTracker';
import { gameModeHandler } from './GameModeHandler';
import { gameStateManager } from './GameStateManager';

// Export classes and singletons
export { GameSessionManager, gameSessionManager } from './GameSessionManager';
export type { SessionContext, SessionBonuses, SessionCompletionResult } from './GameSessionManager';

export { GameProgressTracker, gameProgressTracker } from './GameProgressTracker';
export type { ProgressMetrics, FeedbackInfo, AnswerValidationResult } from './GameProgressTracker';

export { GameModeHandler, gameModeHandler } from './GameModeHandler';

export { GameStateManager, gameStateManager } from './GameStateManager';
export type { GameStateSnapshot, GameInitializationOptions } from './GameStateManager';

// Convenience export of all singleton instances
export const gameServices = {
  sessionManager: gameSessionManager,
  progressTracker: gameProgressTracker,
  modeHandler: gameModeHandler,
  stateManager: gameStateManager,
} as const;
