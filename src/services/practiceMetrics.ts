export const getUtcCalendarDay = (timestamp: number | Date): string =>
  new Date(timestamp).toISOString().slice(0, 10);

export const calculatePracticeStreak = (
  practiceDays: readonly string[],
  now: number | Date = Date.now()
): number => {
  const days = new Set(practiceDays);
  const cursor = new Date(`${getUtcCalendarDay(now)}T00:00:00.000Z`);

  if (!days.has(getUtcCalendarDay(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (days.has(getUtcCalendarDay(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
};
