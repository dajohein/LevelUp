/**
 * Services Index
 * Central export point for all service modules
 */

// Core services
export { enhancedWordService } from './enhancedWordService';
export { enhancedStorage } from './storage/enhancedStorage';
export { tieredStorage } from './storage/tieredStorage';
export { indexedDBStorage } from './storage/indexedDB';
export { userLearningProfileStorage } from './storage/userLearningProfile';

// AI services
export { aiEnhancedWordService } from './aiEnhancedWordService';
export { adaptiveLearningEngine } from './adaptiveLearningEngine';

// AI components (for demos)
export { AdvancedMLModels } from './ai/advancedMLModels';
export { AILearningCoach } from './ai/learningCoach';
export { AdvancedPatternRecognizer } from './ai/advancedPatternRecognizer';

// Utility services
export { logger } from './logger';