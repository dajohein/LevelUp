/**
 * Hook for managing user learning profile data
 * USER-SPECIFIC profiles (not language-specific)
 * Integrates with tiered storage system
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UserLearningProfileStorage,
  type UserLearningProfile,
} from '../services/storage/userLearningProfile';
import { logger } from '../services/logger';

interface UseUserLearningProfileReturn {
  profile: UserLearningProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserLearningProfile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  resetProfile: () => Promise<void>;
  clearProfile: () => Promise<void>;
  isRefreshing: boolean;
  isResetting: boolean;
}

export const useUserLearningProfile = (userId: string): UseUserLearningProfileReturn => {
  const [profile, setProfile] = useState<UserLearningProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [storage] = useState(() => new UserLearningProfileStorage());

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.debug('Starting profile load with timeout...', { userId });

      // Add timeout to prevent hanging
      const loadWithTimeout = Promise.race([
        storage.loadProfile(userId),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Profile loading timed out after 10 seconds')), 10000)
        ),
      ]);

      let profileData = await loadWithTimeout;
      logger.debug('Profile load completed', { userId, hasData: !!profileData });

      // If no profile exists, create an initial one
      if (!profileData) {
        logger.info('No learning profile found, creating initial profile', { userId });
        try {
          const createWithTimeout = Promise.race([
            storage.createInitialProfile(userId),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Profile creation timed out after 10 seconds')),
                10000
              )
            ),
          ]);

          profileData = await createWithTimeout;
          logger.info('Initial profile created successfully', { userId, profileData });
        } catch (createError) {
          logger.error('Failed to create initial profile', { userId, createError });
          throw createError;
        }
      }

      setProfile(profileData);
      logger.debug('Profile set in state', { userId, hasProfile: !!profileData });
    } catch (err) {
      logger.error('Failed to load learning profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [userId, storage]);

  const updateProfile = useCallback(
    async (updates: Partial<UserLearningProfile>): Promise<boolean> => {
      if (!userId || !profile) return false;

      try {
        setError(null);
        const updated = {
          ...profile,
          ...updates,
          metadata: {
            ...profile.metadata,
            ...updates.metadata,
            lastUpdated: new Date(),
          },
        };
        await storage.saveProfile(userId, updated);
        setProfile(updated);
        return true;
      } catch (err) {
        logger.error('Failed to update learning profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to update profile');
        return false;
      }
    },
    [userId, profile, storage]
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setIsRefreshing(true);
      setError(null);

      // Use the new refresh method from storage
      const refreshedProfile = await storage.refreshProfile(userId);
      if (refreshedProfile) {
        setProfile(refreshedProfile);
        logger.info('Profile refreshed successfully', { userId });
      } else {
        // If refresh returns null, reload from scratch
        await loadProfile();
      }
    } catch (err) {
      logger.error('Failed to refresh learning profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, storage, loadProfile]);

  const resetProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setIsResetting(true);
      setError(null);

      // Use the new reset method from storage
      const newProfile = await storage.resetProfile(userId);
      setProfile(newProfile);
      logger.info('Profile reset successfully', { userId });
    } catch (err) {
      logger.error('Failed to reset learning profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset profile');
    } finally {
      setIsResetting(false);
    }
  }, [userId, storage]);

  const clearProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setError(null);
      await storage.deleteProfile(userId);
      setProfile(null);
    } catch (err) {
      logger.error('Failed to clear learning profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear profile');
    }
  }, [userId, storage]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile,
    resetProfile,
    clearProfile,
    isRefreshing,
    isResetting,
  };
};
