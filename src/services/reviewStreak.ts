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

/**
 * The gate grows with the streak. It is half of the base review intervals (1h, 4h, 1 day; see
 * LEARNING_CONSTANTS), which is the shortest a word's interval can be after the phase multiplier,
 * so a learner who answers correctly when a word comes due always moves forward. A flat 12h gate
 * made new words come back every few hours without their streak ever advancing.
 */
export const STREAK_GATE_HOURS = [0.5, 2, MIN_STREAK_GAP_HOURS] as const;

const gateHours = (streak: number): number =>
  STREAK_GATE_HOURS[Math.min(streak, STREAK_GATE_HOURS.length - 1)];

type StreakFields = Pick<
  WordProgress,
  'consecutiveCorrect' | 'streakUpdatedAt' | 'timesCorrect' | 'timesIncorrect'
>;

/**
 * Current review streak. Progress saved before streaks were tracked has no
 * `consecutiveCorrect`; fall back to the old estimate so existing learners keep their schedule.
 */
export const getReviewStreak = (progress: StreakFields): number => {
  const streak =
    progress.consecutiveCorrect ?? Math.max(0, progress.timesCorrect - progress.timesIncorrect);
  // Corrupted or imported data (undefined counts, negative numbers) must not leak NaN into the
  // schedule: a NaN streak produces an invalid review date and the word is silently never due.
  return Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
};

export interface StreakUpdate {
  consecutiveCorrect: number;
  streakUpdatedAt?: string;
}

/**
 * Streak after an answer:
 * - incorrect: lapse, back to 0
 * - correct but assisted (hints / in-session retry): unchanged, it proves nothing about recall
 * - correct: +1, unless the streak already grew less than STREAK_GATE_HOURS ago (a flat
 *   MIN_STREAK_GAP_HOURS at most), so drilling one word in a sitting cannot skip ahead
 */
export const nextReviewStreak = (
  progress: StreakFields,
  isCorrect: boolean,
  assisted: boolean,
  now: Date = new Date()
): StreakUpdate => {
  const current = getReviewStreak(progress);
  const unchanged = { consecutiveCorrect: current, streakUpdatedAt: progress.streakUpdatedAt };

  // A lapse also clears the gate: the next correct answer after a miss must count, or a learner
  // who just recovered a word would be stuck at 0 for up to 12 hours.
  if (!isCorrect) return { consecutiveCorrect: 0, streakUpdatedAt: undefined };
  if (assisted) return unchanged;

  const last = progress.streakUpdatedAt ? new Date(progress.streakUpdatedAt).getTime() : NaN;
  const hoursSince = (now.getTime() - last) / (60 * 60 * 1000);
  // A stamp in the future (clock skew, imported data) is invalid, not "very recent"
  if (!Number.isNaN(last) && hoursSince >= 0 && hoursSince < gateHours(current)) return unchanged;

  return { consecutiveCorrect: current + 1, streakUpdatedAt: now.toISOString() };
};
