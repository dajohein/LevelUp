/**
 * Centralized Word Selection Manager
 * 
 * Consolidates all word selection logic that was previously scattered across
 * multiple services. Provides a unified, consistent interface for intelligent
 * word selection with proper repetition prevention.
 */

import { Word, getWordsForLanguage } from './wordService';
import { getWordsForModule } from './moduleService';
import { WordProgress } from '../store/types';
import { calculateMasteryDecay } from './masteryService';
import { logger } from './logger';

// Selection criteria for different learning contexts
export interface WordSelectionCriteria {
  // Basic filtering
  excludeWordIds?: string[];
  recentlyUsedWords?: string[];
  maxRecentTracking?: number; // How many recent words to track (default: 8)
  
  // Content filtering
  languageCode: string;
  moduleId?: string;
  minMastery?: number;
  maxMastery?: number;
  
  // Learning context
  difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
  learningPhase?: 'introduction' | 'practice' | 'review' | 'mastery';
  sessionProgress?: number; // 0-1, how far through current session
  
  // AI/adaptive parameters
  cognitiveLoad?: 'low' | 'medium' | 'high';
  recentPerformance?: Array<{ isCorrect: boolean; timeSpent: number }>;
  
  // Service-specific preferences
  prioritizeStruggling?: boolean;
  allowMasteredWords?: boolean;
  preferComplexWords?: boolean;
  
  // Pool size control
  candidatePoolSize?: number;
  topCandidatesCount?: number;
}

export interface WordSelectionResult {
  word: Word;
  selectionReason: string;
  alternatives: Word[];
  metadata: {
    poolSize: number;
    masteryScore: number;
    selectionAlgorithm: string;
    exclusionCount: number;
  };
}

export interface WordSessionTracker {
  sessionId: string;
  usedWordIds: Set<string>;
  recentlyUsedWords: string[];
  sessionStartTime: number;
  maxRecentTracking: number;
}

/**
 * Centralized Word Selection Manager
 * Replaces scattered word selection logic across all services
 */
class WordSelectionManager {
  private sessionTrackers = new Map<string, WordSessionTracker>();
  private static instance: WordSelectionManager;

  public static getInstance(): WordSelectionManager {
    if (!WordSelectionManager.instance) {
      WordSelectionManager.instance = new WordSelectionManager();
    }
    return WordSelectionManager.instance;
  }

  /**
   * Create or get a session tracker for word selection
   */
  public createSession(sessionId: string, maxRecentTracking: number = 8): WordSessionTracker {
    const tracker: WordSessionTracker = {
      sessionId,
      usedWordIds: new Set(),
      recentlyUsedWords: [],
      sessionStartTime: Date.now(),
      maxRecentTracking
    };
    
    this.sessionTrackers.set(sessionId, tracker);
    logger.debug(`📝 Created word selection session: ${sessionId}`);
    return tracker;
  }

  /**
   * Get an existing session tracker
   */
  public getSession(sessionId: string): WordSessionTracker | null {
    return this.sessionTrackers.get(sessionId) || null;
  }

  /**
   * Reset a session (clear all tracking)
   */
  public resetSession(sessionId: string): void {
    const tracker = this.sessionTrackers.get(sessionId);
    if (tracker) {
      tracker.usedWordIds.clear();
      tracker.recentlyUsedWords = [];
      tracker.sessionStartTime = Date.now();
      logger.debug(`🔄 Reset word selection session: ${sessionId}`);
    }
  }

  /**
   * Mark a word as used in a session
   */
  public markWordAsUsed(sessionId: string, wordId: string): void {
    const tracker = this.sessionTrackers.get(sessionId);
    if (!tracker) {
      logger.warn(`Session ${sessionId} not found for marking word as used`);
      return;
    }

    // Add to used words set
    tracker.usedWordIds.add(wordId);
    
    // Add to recently used (sliding window)
    tracker.recentlyUsedWords = [
      wordId,
      ...tracker.recentlyUsedWords.filter(id => id !== wordId)
    ].slice(0, tracker.maxRecentTracking);

    // Clean up used words if set gets too large
    if (tracker.usedWordIds.size > 100) {
      const oldestWords = Array.from(tracker.usedWordIds).slice(0, 20);
      oldestWords.forEach(id => tracker.usedWordIds.delete(id));
    }

    logger.debug(`📌 Marked word ${wordId} as used in session ${sessionId} (recent: ${tracker.recentlyUsedWords.length})`);
  }

  /**
   * Core intelligent word selection algorithm
   */
  public selectWord(
    criteria: WordSelectionCriteria,
    wordProgress: { [key: string]: WordProgress },
    sessionId?: string
  ): WordSelectionResult | null {
    
    // Get base word pool
    const allWords = criteria.moduleId 
      ? getWordsForModule(criteria.languageCode, criteria.moduleId)
      : getWordsForLanguage(criteria.languageCode);

    if (allWords.length === 0) {
      logger.warn(`No words available for selection`, { criteria });
      return null;
    }

    // Get session tracking data
    let sessionTracker: WordSessionTracker | null = null;
    if (sessionId) {
      sessionTracker = this.getSession(sessionId);
      if (!sessionTracker) {
        sessionTracker = this.createSession(sessionId, criteria.maxRecentTracking);
      }
    }

    // Combine exclusion lists
    const allExcluded = new Set([
      ...(criteria.excludeWordIds || []),
      ...(criteria.recentlyUsedWords || []),
      ...(sessionTracker?.recentlyUsedWords || []),
      ...(sessionTracker ? Array.from(sessionTracker.usedWordIds) : [])
    ]);

    // Calculate mastery for all words
    const wordsWithMastery = allWords.map(word => {
      const progress = wordProgress[word.id];
      const currentMastery = progress 
        ? calculateMasteryDecay(progress.lastPracticed, progress.xp || 0)
        : 0;
      
      return {
        ...word,
        currentMastery,
        progress
      };
    });

    // Apply filtering
    let candidates = this.applyFiltering(wordsWithMastery, criteria, allExcluded);
    
    if (candidates.length === 0) {
      // Fallback: loosen restrictions
      logger.warn(`No candidates after filtering, loosening restrictions`);
      const recentOnly = sessionTracker?.recentlyUsedWords.slice(-3) || [];
      const loosenedExcluded = new Set(recentOnly);
      candidates = this.applyFiltering(wordsWithMastery, criteria, loosenedExcluded);
    }

    if (candidates.length === 0) {
      logger.error(`Still no candidates available for word selection`, { criteria });
      return null;
    }

    // Apply intelligent selection algorithm
    const result = this.applySelectionAlgorithm(candidates, criteria, wordProgress);
    
    // Mark as used if session tracking is enabled
    if (sessionId && result) {
      this.markWordAsUsed(sessionId, result.word.id);
    }

    logger.debug(`🎯 Selected word: ${result?.word.term}`, {
      reason: result?.selectionReason,
      poolSize: candidates.length,
      mastery: result?.metadata.masteryScore
    });

    return result;
  }

  /**
   * Apply filtering based on criteria
   */
  private applyFiltering(
    words: Array<Word & { currentMastery: number; progress?: WordProgress }>,
    criteria: WordSelectionCriteria,
    excludedIds: Set<string>
  ): Array<Word & { currentMastery: number; progress?: WordProgress }> {
    
    return words.filter(word => {
      // Basic exclusions
      if (excludedIds.has(word.id)) return false;
      
      // Mastery range filtering
      if (criteria.minMastery !== undefined && word.currentMastery < criteria.minMastery) return false;
      if (criteria.maxMastery !== undefined && word.currentMastery > criteria.maxMastery) return false;
      
      // Learning phase filtering
      if (criteria.learningPhase === 'introduction' && word.currentMastery > 20) return false;
      if (criteria.learningPhase === 'mastery' && word.currentMastery < 80) return false;
      
      return true;
    });
  }

  /**
   * Apply intelligent selection algorithm based on criteria
   */
  private applySelectionAlgorithm(
    candidates: Array<Word & { currentMastery: number; progress?: WordProgress }>,
    criteria: WordSelectionCriteria,
    wordProgress: { [key: string]: WordProgress }
  ): WordSelectionResult | null {
    
    if (candidates.length === 0) return null;

    // Calculate priority scores for each candidate
    const scoredCandidates = candidates.map(word => ({
      word,
      score: this.calculateWordScore(word, criteria, wordProgress)
    }));

    // Sort by score (lower = higher priority)
    scoredCandidates.sort((a, b) => a.score - b.score);

    // Select based on criteria
    const topCount = Math.min(
      criteria.topCandidatesCount || 3,
      Math.max(1, Math.floor(scoredCandidates.length * 0.2))
    );
    
    const topCandidates = scoredCandidates.slice(0, topCount);
    const selectedIndex = this.getSelectionIndex(topCandidates, criteria);
    const selected = topCandidates[selectedIndex];

    return {
      word: selected.word,
      selectionReason: this.getSelectionReason(selected.word, criteria),
      alternatives: topCandidates.slice(0, 5).map(c => c.word),
      metadata: {
        poolSize: candidates.length,
        masteryScore: selected.word.currentMastery,
        selectionAlgorithm: this.getAlgorithmName(criteria),
        exclusionCount: candidates.length - scoredCandidates.length
      }
    };
  }

  /**
   * Calculate priority score for a word (lower = higher priority)
   */
  private calculateWordScore(
    word: Word & { currentMastery: number; progress?: WordProgress },
    criteria: WordSelectionCriteria,
    _wordProgress: { [key: string]: WordProgress } // Using underscore to indicate intentionally unused
  ): number {
    let score = word.currentMastery; // Base score from mastery

    const progress = word.progress;

    // Heavily prioritize struggling words
    if (criteria.prioritizeStruggling && word.currentMastery < 30) {
      score *= 0.1;
    }

    // Factor in recent performance
    if (progress) {
      const errorRate = progress.timesIncorrect / Math.max(1, progress.timesCorrect + progress.timesIncorrect);
      if (errorRate > 0.5) {
        score *= 0.2; // Very high priority for error-prone words
      }

      // Time-based priority (words not practiced recently)
      if (progress.lastPracticed) {
        const hoursSince = (Date.now() - new Date(progress.lastPracticed).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) score *= 0.5; // Higher priority for old words
      }
    }

    // Cognitive load adjustment
    if (criteria.cognitiveLoad === 'high' && word.currentMastery > 70) {
      score *= 2; // Lower priority for complex words when cognitive load is high
    }

    // Difficulty preference
    if (criteria.difficulty === 'hard' && word.currentMastery < 50) {
      score *= 2; // Lower priority for easy words in hard mode
    }

    // Session progress adjustment
    if (criteria.sessionProgress) {
      if (criteria.sessionProgress < 0.3 && word.currentMastery > 80) {
        score *= 1.5; // Slightly lower priority for mastered words early in session
      }
    }

    return Math.max(0, score);
  }

  /**
   * Get selection index with appropriate randomness
   */
  private getSelectionIndex(
    topCandidates: Array<{ word: Word; score: number }>,
    _criteria: WordSelectionCriteria // Using underscore to indicate intentionally unused
  ): number {
    if (topCandidates.length === 1) return 0;

    // Weighted random selection favoring better scores
    const weights = topCandidates.map((_, index) => 
      Math.pow(0.5, index) // Exponential decay in probability
    );
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) return i;
    }
    
    return 0; // Fallback
  }

  /**
   * Generate human-readable selection reason
   */
  private getSelectionReason(word: Word, _criteria: WordSelectionCriteria): string {
    const mastery = (word as any).currentMastery || 0;
    
    if (mastery < 30) return 'Struggling word - needs attention';
    if (mastery < 50) return 'Learning word - building familiarity';
    if (mastery < 80) return 'Practicing word - reinforcing knowledge';
    return 'Mastered word - maintenance review';
  }

  /**
   * Get algorithm name for debugging
   */
  private getAlgorithmName(criteria: WordSelectionCriteria): string {
    if (criteria.prioritizeStruggling) return 'struggle-priority';
    if (criteria.difficulty === 'hard') return 'difficulty-adaptive';
    if (criteria.learningPhase) return `${criteria.learningPhase}-optimized`;
    return 'mastery-balanced';
  }

  /**
   * Clean up old sessions
   */
  public cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [sessionId, tracker] of this.sessionTrackers) {
      if (now - tracker.sessionStartTime > maxAge) {
        toDelete.push(sessionId);
      }
    }
    
    toDelete.forEach(sessionId => {
      this.sessionTrackers.delete(sessionId);
      logger.debug(`🗑️ Cleaned up old word selection session: ${sessionId}`);
    });
  }

  /**
   * Get session statistics for debugging
   */
  public getSessionStats(sessionId: string): any {
    const tracker = this.sessionTrackers.get(sessionId);
    if (!tracker) return null;

    return {
      sessionId,
      usedWordsCount: tracker.usedWordIds.size,
      recentWordsCount: tracker.recentlyUsedWords.length,
      sessionAgeMinutes: (Date.now() - tracker.sessionStartTime) / (1000 * 60),
      maxRecentTracking: tracker.maxRecentTracking
    };
  }
}

// Export singleton instance
export const wordSelectionManager = WordSelectionManager.getInstance();

// Convenience functions for common use cases
export const selectWordForRegularSession = (
  languageCode: string,
  wordProgress: { [key: string]: WordProgress },
  sessionId: string,
  moduleId?: string
): WordSelectionResult | null => {
  return wordSelectionManager.selectWord({
    languageCode,
    moduleId,
    prioritizeStruggling: true,
    difficulty: 'adaptive',
    maxRecentTracking: 8
  }, wordProgress, sessionId);
};

export const selectWordForChallenge = (
  languageCode: string,
  wordProgress: { [key: string]: WordProgress },
  sessionId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  moduleId?: string
): WordSelectionResult | null => {
  return wordSelectionManager.selectWord({
    languageCode,
    moduleId,
    difficulty,
    prioritizeStruggling: difficulty === 'easy',
    allowMasteredWords: difficulty === 'hard',
    maxRecentTracking: 12
  }, wordProgress, sessionId);
};

export const selectWordForReview = (
  languageCode: string,
  wordProgress: { [key: string]: WordProgress },
  sessionId: string,
  moduleId?: string
): WordSelectionResult | null => {
  return wordSelectionManager.selectWord({
    languageCode,
    moduleId,
    learningPhase: 'review',
    minMastery: 30,
    prioritizeStruggling: true,
    maxRecentTracking: 15
  }, wordProgress, sessionId);
};