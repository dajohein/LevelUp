import { getDueWords, getNextReviewAt } from '../spacedRepetitionService';
import type { WordProgress } from '../../store/types';
import type { Word } from '../wordService';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const word = (id: string): Word => ({ id, term: id, definition: id });
const progress = (id: string, over: Partial<WordProgress>): WordProgress => ({
  wordId: id,
  xp: 30,
  lastPracticed: hoursAgo(1),
  timesCorrect: 0,
  timesIncorrect: 0,
  ...over,
});

const dueTime = (p: WordProgress): number => {
  const at = getNextReviewAt(p);
  if (!at) throw new Error('expected a review time');
  return at.getTime();
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe('review scheduling', () => {
  it('has no review time for a word that was never practiced', () => {
    expect(getNextReviewAt(undefined)).toBeNull();
    expect(getDueWords([word('a')], {})).toEqual([]);
  });

  it('a lapse brings the next review much closer than a long streak', () => {
    const lapsed = progress('a', { timesCorrect: 30, timesIncorrect: 2, consecutiveCorrect: 0 });
    const steady = progress('b', { timesCorrect: 30, timesIncorrect: 2, consecutiveCorrect: 5 });
    const lapsedAt = dueTime(lapsed);
    const steadyAt = dueTime(steady);
    expect(steadyAt - lapsedAt).toBeGreaterThan(24 * 3_600_000);
  });

  it('legacy progress (no streak field) keeps its old schedule', () => {
    const legacy = progress('a', { timesCorrect: 6, timesIncorrect: 1 });
    const explicit = progress('a', { timesCorrect: 6, timesIncorrect: 1, consecutiveCorrect: 5 });
    expect(dueTime(legacy)).toBe(dueTime(explicit));
  });

  it('returns only overdue words, most overdue first', () => {
    const words = [word('fresh'), word('old'), word('older'), word('never')];
    const wordProgress = {
      fresh: progress('fresh', { lastPracticed: hoursAgo(0) }),
      old: progress('old', { lastPracticed: hoursAgo(200), consecutiveCorrect: 1 }),
      older: progress('older', { lastPracticed: hoursAgo(900), consecutiveCorrect: 1 }),
    };
    expect(getDueWords(words, wordProgress, NOW).map(w => w.id)).toEqual(['older', 'old']);
  });
});

describe('review scheduling robustness', () => {
  it('a word with an unparseable lastPracticed is due, not silently skipped', () => {
    const bad = progress('bad', { lastPracticed: 'garbage' });
    expect(getDueWords([word('bad')], { bad }, NOW).map(w => w.id)).toEqual(['bad']);
  });

  it('a streak beyond the longest interval still gets a valid date', () => {
    const at = getNextReviewAt(progress('a', { consecutiveCorrect: 40 }));
    expect(at && Number.isNaN(at.getTime())).toBe(false);
  });

  it('a word is due exactly at its due instant', () => {
    const p = progress('a', { lastPracticed: hoursAgo(10), consecutiveCorrect: 0 });
    const dueAt = getNextReviewAt(p);
    if (!dueAt) throw new Error('expected a review time');
    expect(getDueWords([word('a')], { a: p }, dueAt).map(w => w.id)).toEqual(['a']);
    expect(getDueWords([word('a')], { a: p }, new Date(dueAt.getTime() - 1))).toEqual([]);
  });
});
