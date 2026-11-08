import { LearningCacheService } from '../cacheService';
import { learningCacheService } from '../cacheService';
import { calculateAchievementStats } from '../levelService';
import type { LearningSession } from '../spacedRepetitionService';
import type { SessionAnalysis } from '../spacedRepetitionService';

const analysis: SessionAnalysis = {
  groupId: 'practice',
  wordsLearned: 20,
  averageAccuracy: 0.8,
  fastestModeCompletion: 'multiple-choice',
  strugglingWords: [],
  recommendations: [],
};

describe('LearningCacheService practice metrics', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-08T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('counts completed sessions rather than answer volume and records one practice day', () => {
    const cache = new LearningCacheService();
    const now = Date.now();

    cache.recordPracticeSession('de', 'session-1', now - 60_000, now, analysis);

    expect(cache.getAnalytics('de')).toMatchObject({
      totalSessions: 1,
      learningStreak: 1,
      practiceDays: ['2026-11-08'],
    });

    cache.recordPracticeSession('de', 'session-2', now - 30_000, now, analysis);
    expect(cache.getAnalytics('de')).toMatchObject({ totalSessions: 2, learningStreak: 1 });
  });

  it('keeps session and day metrics language-scoped and persistent across reloads', () => {
    const cache = new LearningCacheService();
    const firstDay = new Date('2026-11-06T23:59:00.000Z').getTime();
    cache.recordPracticeSession('de', 'de-1', firstDay, firstDay, analysis);
    cache.recordPracticeSession('es', 'es-1', firstDay, firstDay, analysis);

    const secondDay = new Date('2026-11-07T00:01:00.000Z').getTime();
    cache.recordPracticeSession('de', 'de-2', secondDay, secondDay, analysis);
    jest.setSystemTime(new Date('2026-11-08T00:01:00.000Z'));

    const reloadedCache = new LearningCacheService();
    expect(reloadedCache.getAnalytics('de')).toMatchObject({
      totalSessions: 2,
      learningStreak: 2,
      practiceDays: ['2026-11-06', '2026-11-07'],
    });
    expect(reloadedCache.getAnalytics('es')).toMatchObject({
      totalSessions: 1,
      learningStreak: 0,
      practiceDays: ['2026-11-06'],
    });
  });

  it('uses the fully-qualified session ID as-is for de-duplication across recording paths', () => {
    const cache = new LearningCacheService();
    const startTime = Date.now() - 60_000;
    const session = { groupId: 'practice' } as LearningSession;

    cache.recordSession('de', session, analysis, [], startTime, Date.now(), `de:${startTime}`);
    cache.recordPracticeSession('de', `de:${startTime}`, startTime, Date.now(), analysis);

    expect(cache.getSessionHistory('de')).toHaveLength(1);
    expect(cache.getSessionHistory('de')[0].id).toBe(`de:${startTime}`);
  });

  it('computes overall streak from the union of language-scoped practice days', () => {
    learningCacheService.clearCache();
    const day1 = new Date('2026-11-06T12:00:00.000Z').getTime();
    const day2 = new Date('2026-11-07T12:00:00.000Z').getTime();
    const day3 = new Date('2026-11-08T12:00:00.000Z').getTime();
    learningCacheService.recordPracticeSession('de', 'de:day-1', day1, day1, analysis);
    learningCacheService.recordPracticeSession('de', 'de:day-2', day2, day2, analysis);
    learningCacheService.recordPracticeSession('es', 'es:day-3', day3, day3, analysis);

    expect(calculateAchievementStats({})).toMatchObject({ learningStreak: 3 });
    learningCacheService.clearCache();
  });
});
