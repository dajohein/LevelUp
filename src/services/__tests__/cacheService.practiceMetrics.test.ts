import { LearningCacheService } from '../cacheService';
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
});
