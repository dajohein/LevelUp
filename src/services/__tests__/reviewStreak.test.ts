import { getReviewStreak, MIN_STREAK_GAP_HOURS, nextReviewStreak } from '../reviewStreak';

const base = { timesCorrect: 0, timesIncorrect: 0 };
const at = (hoursAfter: number, from = '2026-01-01T00:00:00.000Z') =>
  new Date(new Date(from).getTime() + hoursAfter * 3_600_000);

describe('getReviewStreak', () => {
  it('uses the tracked streak when present', () => {
    expect(getReviewStreak({ ...base, timesCorrect: 10, consecutiveCorrect: 2 })).toBe(2);
    expect(getReviewStreak({ ...base, timesCorrect: 10, consecutiveCorrect: 0 })).toBe(0);
  });

  it('falls back to the legacy estimate for progress saved before streaks existed', () => {
    expect(getReviewStreak({ timesCorrect: 5, timesIncorrect: 2 })).toBe(3);
    expect(getReviewStreak({ timesCorrect: 1, timesIncorrect: 4 })).toBe(0);
  });
});

describe('nextReviewStreak', () => {
  it('increments on a correct answer and records when', () => {
    const now = at(0);
    expect(nextReviewStreak(base, true, false, now)).toEqual({
      consecutiveCorrect: 1,
      streakUpdatedAt: now.toISOString(),
    });
  });

  it('resets to zero on a lapse, however long the streak was', () => {
    expect(nextReviewStreak({ ...base, consecutiveCorrect: 5 }, false, false, at(0))).toMatchObject(
      { consecutiveCorrect: 0 }
    );
  });

  it('a lapse beats a long lifetime record (old formula barely noticed lapses)', () => {
    const progress = { timesCorrect: 30, timesIncorrect: 2 };
    expect(getReviewStreak(progress)).toBe(28);
    const after = nextReviewStreak(progress, false, false, at(0));
    expect(after.consecutiveCorrect).toBe(0);
  });

  it('leaves the streak unchanged for assisted correct answers', () => {
    const progress = { ...base, consecutiveCorrect: 3, streakUpdatedAt: at(0).toISOString() };
    expect(nextReviewStreak(progress, true, true, at(100))).toEqual({
      consecutiveCorrect: 3,
      streakUpdatedAt: progress.streakUpdatedAt,
    });
  });

  it('does not grow the streak twice within the minimum gap (no cramming)', () => {
    const first = nextReviewStreak(base, true, false, at(0));
    const second = nextReviewStreak(
      { ...base, ...first },
      true,
      false,
      at(MIN_STREAK_GAP_HOURS - 1)
    );
    expect(second.consecutiveCorrect).toBe(1);
    const third = nextReviewStreak({ ...base, ...first }, true, false, at(MIN_STREAK_GAP_HOURS));
    expect(third.consecutiveCorrect).toBe(2);
  });

  it('a lapse inside the gap still resets', () => {
    const first = nextReviewStreak(base, true, false, at(0));
    expect(nextReviewStreak({ ...base, ...first }, false, false, at(1)).consecutiveCorrect).toBe(0);
  });

  it('continues from the legacy estimate rather than restarting at one', () => {
    const next = nextReviewStreak({ timesCorrect: 4, timesIncorrect: 1 }, true, false, at(0));
    expect(next.consecutiveCorrect).toBe(4);
  });
});
