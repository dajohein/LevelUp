/**
 * Learning Cache Service
 *
 * Manages caching and persistence of learning groups and sessions
 * Optimizes performance by reducing redundant calculations
 */

import { WordProgress } from '../store/types';
import { Word } from './wordService';
import {
  WordGroup,
  LearningSession,
  createWordGroups,
  selectWordsForReview,
  createLearningSession,
  SessionAnalysis,
} from './spacedRepetitionService';
import { logger } from './logger';
import { calculatePracticeStreak, getUtcCalendarDay } from './practiceMetrics';

// Cache keys for localStorage
const CACHE_KEYS = {
  WORD_GROUPS: 'learning_word_groups',
  SESSION_HISTORY: 'learning_session_history',
  LEARNING_ANALYTICS: 'learning_analytics',
} as const;

// Cache configuration
const CACHE_CONFIG = {
  MAX_SESSION_HISTORY: 50, // Keep last 50 sessions
  MAX_GROUPS_PER_LANGUAGE: 20, // Maximum groups per language
  CACHE_EXPIRY_HOURS: 24, // Recalculate groups after 24h
  ANALYTICS_RETENTION_DAYS: 30, // Keep analytics for 30 days
} as const;

// Interfaces for cached data
interface CachedWordGroups {
  [languageCode: string]: {
    groups: WordGroup[];
    lastUpdated: string;
    version: number;
  };
}

interface SessionRecord {
  id: string;
  languageCode: string;
  groupId: string;
  startTime: string;
  endTime: string;
  performance: SessionAnalysis;
  wordsStudied: string[];
}

interface LearningAnalytics {
  [languageCode: string]: {
    totalSessions: number;
    totalWordsLearned: number;
    averageAccuracy: number;
    preferredQuizModes: Record<string, number>;
    learningStreak: number;
    practiceDays: string[];
    lastSessionDate: string;
    weeklyProgress: Array<{
      week: string;
      sessionsCompleted: number;
      wordsLearned: number;
      accuracyRate: number;
    }>;
  };
}

export class LearningCacheService {
  private wordGroupsCache: CachedWordGroups = {};
  private sessionHistory: SessionRecord[] = [];
  private analytics: LearningAnalytics = {};
  private lastAnalyticsReload = 0;
  private readonly ANALYTICS_CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load cached data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const cachedGroups = localStorage.getItem(CACHE_KEYS.WORD_GROUPS);
      if (cachedGroups) {
        this.wordGroupsCache = JSON.parse(cachedGroups);
      }

      const cachedHistory = localStorage.getItem(CACHE_KEYS.SESSION_HISTORY);
      if (cachedHistory) {
        this.sessionHistory = JSON.parse(cachedHistory);
      }

      const cachedAnalytics = localStorage.getItem(CACHE_KEYS.LEARNING_ANALYTICS);
      if (cachedAnalytics) {
        this.analytics = JSON.parse(cachedAnalytics);
      }

      logger.debug('📊 Learning cache loaded from storage');
    } catch (error) {
      logger.error('Failed to load learning cache:', error);
      this.clearCache();
    }
  }

  /**
   * Save cached data to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(CACHE_KEYS.WORD_GROUPS, JSON.stringify(this.wordGroupsCache));
      localStorage.setItem(CACHE_KEYS.SESSION_HISTORY, JSON.stringify(this.sessionHistory));
      localStorage.setItem(CACHE_KEYS.LEARNING_ANALYTICS, JSON.stringify(this.analytics));

      logger.debug('💾 Learning cache saved to storage');
    } catch (error) {
      logger.error('Failed to save learning cache:', error);
    }
  }

  /**
   * Get or create word groups for a language
   */
  getWordGroups(
    languageCode: string,
    words: Word[],
    wordProgress: { [key: string]: WordProgress },
    forceRefresh = false
  ): WordGroup[] {
    const cached = this.wordGroupsCache[languageCode];
    const now = new Date();

    // Check if cache is valid
    if (!forceRefresh && cached && cached.groups.length > 0) {
      const lastUpdated = new Date(cached.lastUpdated);
      const hoursOld = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursOld < CACHE_CONFIG.CACHE_EXPIRY_HOURS) {
        logger.debug(
          `📋 Using cached word groups for ${languageCode} (${Math.round(hoursOld)}h old)`
        );
        return cached.groups;
      }
    }

    // Create new groups
    logger.debug(`🔄 Creating new word groups for ${languageCode}`);
    const newGroups = createWordGroups(words, wordProgress);

    // Limit number of groups
    const limitedGroups = newGroups.slice(0, CACHE_CONFIG.MAX_GROUPS_PER_LANGUAGE);

    // Update cache
    this.wordGroupsCache[languageCode] = {
      groups: limitedGroups,
      lastUpdated: now.toISOString(),
      version: (cached?.version || 0) + 1,
    };

    this.saveToStorage();
    return limitedGroups;
  }

  /**
   * Get the next recommended word group for learning
   */
  getNextLearningGroup(
    languageCode: string,
    words: Word[],
    wordProgress: { [key: string]: WordProgress }
  ): WordGroup | null {
    const groups = this.getWordGroups(languageCode, words, wordProgress);

    if (groups.length === 0) return null;

    // Prioritize groups by learning phase and practice frequency
    const prioritizedGroups = groups
      .map(group => {
        const priority = this.calculateGroupPriority(group, wordProgress);
        return { group, priority };
      })
      .sort((a, b) => a.priority - b.priority) // Lower number = higher priority
      .map(item => item.group);

    const selectedGroup = prioritizedGroups[0];
    logger.debug(`🎯 Selected group for learning:`, {
      id: selectedGroup.id,
      phase: selectedGroup.phase,
      wordCount: selectedGroup.words.length,
      averageMastery: Math.round(selectedGroup.averageMastery),
    });

    return selectedGroup;
  }

  /**
   * Calculate priority score for a word group (lower = higher priority)
   */
  private calculateGroupPriority(
    group: WordGroup,
    _wordProgress: { [key: string]: WordProgress }
  ): number {
    let priority = 0;

    // Phase-based priority
    switch (group.phase) {
      case 'introduction':
        priority += 1; // Highest priority
        break;
      case 'learning':
        priority += 2;
        break;
      case 'consolidation':
        priority += 3;
        break;
      case 'mastery':
        priority += 4; // Lowest priority
        break;
    }

    // Time since last practice
    if (group.lastPracticed) {
      const hoursAgo = (Date.now() - new Date(group.lastPracticed).getTime()) / (1000 * 60 * 60);

      // Boost priority if not practiced recently
      if (hoursAgo > 24) priority -= 1;
      if (hoursAgo > 72) priority -= 2;
    } else {
      priority -= 2; // Never practiced - high priority
    }

    // Session count factor (avoid over-practicing)
    if (group.sessionCount > 3) priority += 1;
    if (group.sessionCount > 6) priority += 2;

    // Average mastery factor
    if (group.averageMastery < 30) priority -= 1;
    if (group.averageMastery < 50) priority -= 0.5;

    return priority;
  }

  /**
   * Create a complete learning session
   */
  createLearningSession(
    languageCode: string,
    words: Word[],
    wordProgress: { [key: string]: WordProgress },
    maxReviewWords = 3
  ): LearningSession | null {
    const targetGroup = this.getNextLearningGroup(languageCode, words, wordProgress);
    if (!targetGroup) {
      logger.warn(`No learning group available for ${languageCode}`);
      return null;
    }

    // Get words for review
    const reviewWords = selectWordsForReview(words, wordProgress, maxReviewWords);

    // Create the session
    const session = createLearningSession(targetGroup, reviewWords, wordProgress);

    logger.debug(`📝 Created learning session:`, {
      languageCode,
      groupId: session.groupId,
      sessionType: session.sessionType,
      totalWords: session.words.length + session.reviewWords.length,
    });

    return session;
  }

  /**
   * Record a completed session and update analytics
   */
  recordSession(
    languageCode: string,
    session: LearningSession,
    performance: SessionAnalysis,
    wordsStudied: string[],
    startTime = Date.now(),
    endTime = Date.now(),
    sessionId = `${languageCode}:${startTime}`
  ): void {
    this.recordPracticeSession(
      languageCode,
      sessionId,
      startTime,
      endTime,
      performance,
      wordsStudied,
      session.groupId
    );
  }

  recordPracticeSession(
    languageCode: string,
    sessionId: string,
    startTime: number,
    endTime: number,
    performance: SessionAnalysis,
    wordsStudied: string[] = [],
    groupId = 'practice'
  ): void {
    const recordId = sessionId;
    if (this.sessionHistory.some(record => record.id === recordId)) return;

    const sessionRecord: SessionRecord = {
      id: recordId,
      languageCode,
      groupId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      performance,
      wordsStudied,
    };

    this.sessionHistory.unshift(sessionRecord);
    this.sessionHistory = this.sessionHistory.slice(0, CACHE_CONFIG.MAX_SESSION_HISTORY);

    const groupCache = this.wordGroupsCache[languageCode];
    const group = groupCache?.groups.find(candidate => candidate.id === groupId);
    if (group) {
      group.lastPracticed = sessionRecord.endTime;
      group.sessionCount++;
    }

    this.updateAnalytics(languageCode, performance, getUtcCalendarDay(endTime), sessionRecord.endTime);
    this.saveToStorage();

    logger.debug(`📈 Recorded session for ${languageCode}:`, {
      sessionId: recordId,
      wordsLearned: performance.wordsLearned,
      accuracy: Math.round(performance.averageAccuracy * 100),
    });
  }

  /**
   * Update learning analytics
   */
  private updateAnalytics(
    languageCode: string,
    performance: SessionAnalysis,
    practiceDay: string,
    sessionEndTime: string
  ): void {
    if (!this.analytics[languageCode]) {
      this.analytics[languageCode] = {
        totalSessions: 0,
        totalWordsLearned: 0,
        averageAccuracy: 0,
        preferredQuizModes: {},
        learningStreak: 0,
        practiceDays: [],
        lastSessionDate: '',
        weeklyProgress: [],
      };
    }

    const analytics = this.analytics[languageCode];

    // Update basic stats
    analytics.totalSessions++;
    analytics.totalWordsLearned += performance.wordsLearned;
    analytics.averageAccuracy =
      (analytics.averageAccuracy * (analytics.totalSessions - 1) + performance.averageAccuracy) /
      analytics.totalSessions;
    analytics.lastSessionDate = sessionEndTime;
    analytics.practiceDays = [...new Set([...(analytics.practiceDays || []), practiceDay])].sort();
    analytics.learningStreak = calculatePracticeStreak(
      analytics.practiceDays,
      new Date(sessionEndTime)
    );

    // Update weekly progress
    const currentWeek = this.getWeekIdentifier(new Date(sessionEndTime));
    let weeklyEntry = analytics.weeklyProgress.find(w => w.week === currentWeek);

    if (!weeklyEntry) {
      weeklyEntry = {
        week: currentWeek,
        sessionsCompleted: 0,
        wordsLearned: 0,
        accuracyRate: 0,
      };
      analytics.weeklyProgress.unshift(weeklyEntry);
    }

    weeklyEntry.sessionsCompleted++;
    weeklyEntry.wordsLearned += performance.wordsLearned;
    weeklyEntry.accuracyRate =
      (weeklyEntry.accuracyRate * (weeklyEntry.sessionsCompleted - 1) +
        performance.averageAccuracy) /
      weeklyEntry.sessionsCompleted;

    // Keep only last 12 weeks
    analytics.weeklyProgress = analytics.weeklyProgress.slice(0, 12);
  }

  /**
   * Get week identifier (YYYY-WW format)
   */
  private getWeekIdentifier(date: Date): string {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const weekNumber = Math.ceil(
      ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  }

  /**
   * Force reload analytics data from localStorage
   */
  reloadAnalytics(): void {
    const now = Date.now();

    // Prevent excessive reloads - only reload if cache is older than 30 seconds
    if (now - this.lastAnalyticsReload < this.ANALYTICS_CACHE_DURATION) {
      return;
    }

    try {
      const cachedAnalytics = localStorage.getItem(CACHE_KEYS.LEARNING_ANALYTICS);
      if (cachedAnalytics) {
        this.analytics = JSON.parse(cachedAnalytics);
        this.lastAnalyticsReload = now;
        logger.debug('📊 Analytics reloaded from storage');
      }
    } catch (error) {
      logger.error('Failed to reload analytics:', error);
    }
  }

  /**
   * Get learning analytics for a language
   */
  getAnalytics(languageCode: string) {
    const analytics = this.analytics[languageCode];
    if (!analytics) return null;

    const practiceDays = analytics.practiceDays || [];
    return {
      ...analytics,
      practiceDays,
      learningStreak: calculatePracticeStreak(practiceDays),
    };
  }

  getPracticeDaysAcrossLanguages(): string[] {
    return [...new Set(Object.values(this.analytics).flatMap(analytics => analytics.practiceDays || []))].sort();
  }

  /**
   * Get session history for a language
   */
  getSessionHistory(languageCode: string, limit = 10): SessionRecord[] {
    return this.sessionHistory
      .filter(session => session.languageCode === languageCode)
      .slice(0, limit);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.wordGroupsCache = {};
    this.sessionHistory = [];
    this.analytics = {};

    localStorage.removeItem(CACHE_KEYS.WORD_GROUPS);
    localStorage.removeItem(CACHE_KEYS.SESSION_HISTORY);
    localStorage.removeItem(CACHE_KEYS.LEARNING_ANALYTICS);

    logger.debug('🗑️ Learning cache cleared');
  }

  /**
   * Force refresh of word groups for a language
   */
  refreshWordGroups(
    languageCode: string,
    words: Word[],
    wordProgress: { [key: string]: WordProgress }
  ): WordGroup[] {
    return this.getWordGroups(languageCode, words, wordProgress, true);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const languages = Object.keys(this.wordGroupsCache);
    const totalGroups = languages.reduce(
      (sum, lang) => sum + this.wordGroupsCache[lang].groups.length,
      0
    );

    return {
      languages: languages.length,
      totalGroups,
      sessionHistory: this.sessionHistory.length,
      cacheSize: this.estimateCacheSize(),
    };
  }

  /**
   * Estimate cache size in KB
   */
  private estimateCacheSize(): number {
    try {
      const serialized = JSON.stringify({
        groups: this.wordGroupsCache,
        history: this.sessionHistory,
        analytics: this.analytics,
      });
      return Math.round(serialized.length / 1024);
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const learningCacheService = new LearningCacheService();
