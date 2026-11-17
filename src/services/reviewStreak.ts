/**
 * Review streak: how many reviews in a row a word was answered correctly, which drives how far
 * out its next review is scheduled (see spacedRepetitionService.calculateNextReviewTime).
 *
 * Pure functions, no dependencies on the store or storage.
 */
import type { WordProgress } from '../store/types';

/**
 * A correct answer only lengthens the streak if the previous increase was at least this long
 * ago. Answering the same word five times in one sitting is practice, not evidence that it will
 * be remembered next week, so it must not skip the learner ahead through the intervals.
 */
export const MIN_STREAK_GAP_HOURS = 12;

type StreakFields = Pick<
  WordProgress,
  'consecutiveCorrect' | 'streakUpdatedAt' | 'timesCorrect' | 'timesIncorrect'
>;

/**
 * Current review streak. Progress saved before streaks were tracked has no
 * `consecutiveCorrect`; fall back to the old estimate so existing learners keep their schedule.
 */
export const getReviewStreak = (progress: StreakFields): number =>
  progress.consecutiveCorrect ?? Math.max(0, progress.timesCorrect - progress.timesIncorrect);

export interface StreakUpdate {
  consecutiveCorrect: number;
  streakUpdatedAt?: string;
}

/**
 * Streak after an answer:
 * - incorrect: lapse, back to 0
 * - correct but assisted (hints / in-session retry): unchanged, it proves nothing about recall
 * - correct: +1, unless the streak already grew less than MIN_STREAK_GAP_HOURS ago
 */
export const nextReviewStreak = (
  progress: StreakFields,
  isCorrect: boolean,
  assisted: boolean,
  now: Date = new Date()
): StreakUpdate => {
  const current = getReviewStreak(progress);
  const unchanged = { consecutiveCorrect: current, streakUpdatedAt: progress.streakUpdatedAt };

  if (!isCorrect) return { consecutiveCorrect: 0, streakUpdatedAt: progress.streakUpdatedAt };
  if (assisted) return unchanged;

  const last = progress.streakUpdatedAt ? new Date(progress.streakUpdatedAt).getTime() : NaN;
  const hoursSince = (now.getTime() - last) / (60 * 60 * 1000);
  if (!Number.isNaN(last) && hoursSince < MIN_STREAK_GAP_HOURS) return unchanged;

  return { consecutiveCorrect: current + 1, streakUpdatedAt: now.toISOString() };
};
