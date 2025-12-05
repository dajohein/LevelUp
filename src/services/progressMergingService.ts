/**
 * Progress Merging Service
 *
 * Handles merging progress data when devices are linked,
 * maintaining language isolation and optimizing for best progress
 */

import { logger } from './logger';
import { remoteStorage } from './storage/remoteStorage';
import type { WordProgress } from '../store/types';

export interface ProgressMergeResult {
  success: boolean;
  mergedLanguages: string[];
  improvementsFound: number;
  error?: string;
}

export interface DeviceProgress {
  deviceId: string;
  progress: Record<string, WordProgress>;
  lastUpdated: number;
}

/**
 * Progress Merging Service
 * Intelligently merges word progress from multiple devices
 */
class ProgressMergingService {
  /**
   * Merge progress from linked devices (placeholder implementation)
   */
  async mergeLinkedDevicesProgress(): Promise<ProgressMergeResult> {
    try {
      logger.info('Starting progress merge for linked devices');

      // Get current session info
      const linkedDevices = await remoteStorage.getLinkedDevicesCount();
      if (linkedDevices <= 1) {
        return {
          success: true,
          mergedLanguages: [],
          improvementsFound: 0,
        };
      }

      // For now, this is a placeholder - actual merging logic would go here
      // when we have multi-device progress storage fully implemented
      logger.info('Progress merging not yet fully implemented');

      return {
        success: true,
        mergedLanguages: [],
        improvementsFound: 0,
      };
    } catch (error) {
      logger.error('Failed to merge linked devices progress:', error);
      return {
        success: false,
        mergedLanguages: [],
        improvementsFound: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get progress merge summary for UI display
   */
  async getProgressMergeSummary(): Promise<{
    canMerge: boolean;
    linkedDevices: number;
    estimatedImprovements: number;
  }> {
    try {
      const linkedDevices = await remoteStorage.getLinkedDevicesCount();

      if (linkedDevices <= 1) {
        return {
          canMerge: false,
          linkedDevices,
          estimatedImprovements: 0,
        };
      }

      // Could implement estimation logic here
      // For now, return that merging is possible
      return {
        canMerge: true,
        linkedDevices,
        estimatedImprovements: 0, // Could be calculated by comparing progress
      };
    } catch (error) {
      logger.warn('Failed to get progress merge summary:', error);
      return {
        canMerge: false,
        linkedDevices: 0,
        estimatedImprovements: 0,
      };
    }
  }
}

export const progressMerging = new ProgressMergingService();
