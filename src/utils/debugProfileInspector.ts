/**
 * Debug utility to inspect stored learning profile data
 */

import { tieredStorage } from '../services/storage/tieredStorage';
import { logger } from '../services/logger';

export async function inspectStoredProfile(userId = 'default-user') {
  try {
    const storageKey = `user-learning-profile-${userId}`;

    logger.info('🔍 Inspecting stored learning profile...', { userId, storageKey });

    // Get raw data from storage
    const result = await tieredStorage.get(storageKey);

    if (result.success && result.data) {
      logger.info('📄 Raw stored data:', result.data);
      logger.info('📊 Data structure analysis:', {
        type: typeof result.data,
        isObject: typeof result.data === 'object',
        keys: result.data && typeof result.data === 'object' ? Object.keys(result.data) : 'N/A',
        hasPersonality: !!(result.data as any)?.personality,
        hasMotivation: !!(result.data as any)?.motivation,
        hasCognitiveLoad: !!(result.data as any)?.cognitiveLoad,
        hasMetadata: !!(result.data as any)?.metadata,
      });

      // Check each expected property
      const data = result.data as any;
      if (data.personality) {
        logger.info('🧠 Personality data:', data.personality);
      } else {
        logger.warn('❌ Missing personality data');
      }

      if (data.motivation) {
        logger.info('💪 Motivation data:', data.motivation);
      } else {
        logger.warn('❌ Missing motivation data');
      }

      if (data.cognitiveLoad) {
        logger.info('🧪 Cognitive load data:', data.cognitiveLoad);
      } else {
        logger.warn('❌ Missing cognitive load data');
      }

      if (data.metadata) {
        logger.info('📋 Metadata:', data.metadata);
      } else {
        logger.warn('❌ Missing metadata');
      }

      return result.data;
    } else {
      logger.warn('❌ No profile data found or failed to load', { result });
      return null;
    }
  } catch (error) {
    logger.error('💥 Error inspecting profile:', error);
    return null;
  }
}

// Make available globally in development
if (typeof window !== 'undefined') {
  (window as any).inspectProfile = inspectStoredProfile;
}
