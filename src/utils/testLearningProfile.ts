/**
 * Test script to verify learning profile storage
 */

import { userLearningProfileStorage } from '../services/storage/userLearningProfile';
import { logger } from '../services/logger';

export async function testLearningProfileStorage(): Promise<void> {
  const testUserId = 'test-user-123';

  try {
    logger.info('🧪 Testing learning profile storage...');

    // Test 1: Try to load non-existent profile
    logger.info('Test 1: Loading non-existent profile');
    const emptyProfile = await userLearningProfileStorage.loadProfile(testUserId);
    logger.info('Empty profile result:', emptyProfile);

    // Test 2: Create initial profile
    logger.info('Test 2: Creating initial profile');
    const initialProfile = await userLearningProfileStorage.createInitialProfile(testUserId);
    logger.info('Initial profile created:', initialProfile);

    // Test 3: Load the created profile
    logger.info('Test 3: Loading created profile');
    const loadedProfile = await userLearningProfileStorage.loadProfile(testUserId);
    logger.info('Loaded profile:', loadedProfile);

    // Test 4: Update profile
    logger.info('Test 4: Updating profile');
    if (loadedProfile) {
      loadedProfile.metadata.totalSessionsAnalyzed = 5;
      loadedProfile.motivation.currentLevel = 0.9;
      await userLearningProfileStorage.saveProfile(testUserId, loadedProfile);
      logger.info('Profile updated successfully');

      // Test 5: Verify update
      const updatedProfile = await userLearningProfileStorage.loadProfile(testUserId);
      logger.info('Updated profile verification:', {
        sessions: updatedProfile?.metadata.totalSessionsAnalyzed,
        motivation: updatedProfile?.motivation.currentLevel,
      });
    }

    logger.info('✅ All learning profile storage tests completed!');
  } catch (error) {
    logger.error('❌ Learning profile storage test failed:', error);
  }
}

// Export the test function for manual execution
