import { calculatePracticeStreak, getUtcCalendarDay } from '../practiceMetrics';

describe('practice metrics', () => {
  it('counts unique consecutive UTC calendar days and tolerates a not-yet-practiced today', () => {
    const now = new Date('2026-11-08T01:00:00.000Z');

    expect(
      calculatePracticeStreak(
        ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-07'],
        now
      )
    ).toBe(3);
    expect(calculatePracticeStreak(['2026-11-05', '2026-11-06'], now)).toBe(0);
  });

  it('starts a new streak after a skipped UTC day and treats midnight as a day boundary', () => {
    const justAfterMidnight = new Date('2026-11-07T00:00:01.000Z');

    expect(calculatePracticeStreak(['2026-11-05', '2026-11-07'], justAfterMidnight)).toBe(1);
    expect(getUtcCalendarDay(new Date('2026-11-08T23:59:59-08:00'))).toBe('2026-11-09');
  });
});
