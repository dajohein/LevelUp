jest.mock('../../services/storageService', () => ({
  gameStateStorage: { load: jest.fn(() => ({})), save: jest.fn() },
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: { safeLoadWordProgress: jest.fn(() => ({})) },
}));
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../services/wordSelectionManager', () => ({
  selectWordForRegularSession: jest.fn(),
  selectWordForMixedPractice: jest.fn(),
}));

import gameReducer, { checkAnswer, setCurrentWord } from '../gameSlice';
import type { WordProgress } from '../types';
import { calculateMasteryDecay } from '../../services/masteryService';
import { getNextReviewAt } from '../../services/spacedRepetitionService';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const word = {
  id: 'es:perro',
  term: 'perro',
  definition: 'hond',
  direction: 'definition-to-term' as const,
};

const progressWith = (xp: number, lastPracticed: string): WordProgress => ({
  wordId: word.id,
  xp,
  totalXp: xp,
  lastPracticed,
  timesCorrect: 5,
  timesIncorrect: 0,
  version: 2,
});

const answer = (progress: WordProgress, text: string, extra: object = {}) => {
  let state = gameReducer(undefined, { type: 'test/initialize' });
  state = { ...state, language: 'es', lives: 5, wordProgress: { [word.id]: progress } };
  state = gameReducer(state, setCurrentWord({ word, options: [], quizMode: 'open-answer' }));
  return gameReducer(state, checkAnswer({ answer: text, ...extra } as never));
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe('mastery decay is applied before an answer changes it', () => {
  // 80 xp is 'advanced': 168h interval, 10% per interval. 240h = 1 interval, so 80 -> 72.
  const STALE = hoursAgo(240);

  it('a correct answer builds on the decayed value, not the stored one', () => {
    const xp = answer(progressWith(80, STALE), 'perro').wordProgress[word.id].xp;
    // 72 decayed, +10.5 (open-answer 15 x 0.7). The old behaviour gave 80 + 10.5 = 90.5.
    expect(xp).toBeCloseTo(82.5, 5);
    expect(xp).toBeLessThan(90);
  });

  it('a wrong answer also starts from the decayed value', () => {
    const xp = answer(progressWith(80, STALE), 'gato').wordProgress[word.id].xp;
    expect(xp).toBeLessThan(72);
  });

  it('a hinted answer changes neither mastery nor the schedule, so decay stays visible', () => {
    const stored = progressWith(80, STALE);
    const progress = answer(stored, 'perro', { hintsUsed: 1 }).wordProgress[word.id];
    // nothing is rewritten: decay is still computed on read, and the clock is not restarted
    expect(progress.xp).toBe(80);
    expect(progress.lastPracticed).toBe(STALE);
    expect(calculateMasteryDecay(progress.lastPracticed, progress.xp)).toBeCloseTo(72, 5);
    // the counters still record that the word was answered correctly
    expect(progress.timesCorrect).toBe(6);
  });

  it('a hinted answer does not push an overdue word out by a whole interval', () => {
    const stored = { ...progressWith(90, hoursAgo(24 * 20)), consecutiveCorrect: 4 };
    const dueBefore = getNextReviewAt(stored);
    const after = answer(stored, 'perro', { hintsUsed: 1 }).wordProgress[word.id];
    expect(getNextReviewAt(after)?.getTime()).toBe(dueBefore?.getTime());
  });

  it('recent practice does not decay', () => {
    const xp = answer(progressWith(80, hoursAgo(2)), 'perro').wordProgress[word.id].xp;
    expect(xp).toBeCloseTo(90.5, 5);
  });

  it('directional mastery decays too', () => {
    const progress: WordProgress = {
      ...progressWith(80, STALE),
      directions: {
        'definition-to-term': {
          timesCorrect: 5,
          timesIncorrect: 0,
          xp: 80,
          lastPracticed: STALE,
          consecutiveCorrect: 3,
        },
      },
    };
    const direction = answer(progress, 'perro').wordProgress[word.id].directions?.[
      'definition-to-term'
    ];
    expect(direction?.xp).toBeCloseTo(82.5, 5);
  });

  it('an invalid imported timestamp never turns mastery into NaN', () => {
    const state = answer(progressWith(80, 'garbage'), 'perro');
    const progress = state.wordProgress[word.id];
    expect(Number.isFinite(progress.xp)).toBe(true);
    expect(progress.xp).toBeCloseTo(90.5, 5);
  });

  it('a future timestamp does not inflate mastery, even for an assisted answer', () => {
    const future = new Date(NOW.getTime() + 20 * 24 * 3_600_000).toISOString();
    const state = answer(progressWith(80, future), 'perro', { hintsUsed: 1 });
    expect(state.wordProgress[word.id].xp).toBe(80);
  });

  it('invalid directional timestamps stay finite too', () => {
    const progress: WordProgress = {
      ...progressWith(80, hoursAgo(1)),
      directions: {
        'definition-to-term': {
          timesCorrect: 1,
          timesIncorrect: 0,
          xp: 60,
          lastPracticed: 'garbage',
          consecutiveCorrect: 1,
        },
      },
    };
    const direction = answer(progress, 'perro').wordProgress[word.id].directions?.[
      'definition-to-term'
    ];
    expect(Number.isFinite(direction?.xp)).toBe(true);
  });

  it('a wrong answer loses from the decayed value, with exact numbers', () => {
    const progress = answer(progressWith(80, hoursAgo(240)), 'gato').wordProgress[word.id];
    // 72 decayed; open-answer loss = 8 * (2 - 0.7 * 0.5) = 13.2 -> 58.8 (old behaviour: 66.8)
    expect(progress.xp).toBeCloseTo(58.8, 5);
    expect(progress.totalXp).toBeCloseTo(58.8, 5);
  });

  it('directional mastery decays from its own timestamp, not the word-level one', () => {
    const progress: WordProgress = {
      ...progressWith(80, hoursAgo(1)),
      directions: {
        'definition-to-term': {
          timesCorrect: 5,
          timesIncorrect: 0,
          xp: 80,
          lastPracticed: hoursAgo(240),
          consecutiveCorrect: 3,
        },
      },
    };
    const next = answer(progress, 'perro').wordProgress[word.id];
    expect(next.xp).toBeCloseTo(90.5, 5); // word-level: recent, no decay
    expect(next.directions?.['definition-to-term']?.xp).toBeCloseTo(82.5, 5); // direction: decayed
  });

  it('non-finite stored mastery is repaired instead of persisting NaN', () => {
    const state = answer(
      { ...progressWith(80, hoursAgo(1)), xp: undefined as unknown as number },
      'perro'
    );
    expect(Number.isFinite(state.wordProgress[word.id].xp)).toBe(true);
  });

  it('an assisted or retried answer does not extend the directional streak either', () => {
    const progress: WordProgress = {
      ...progressWith(80, hoursAgo(1)),
      directions: {
        'definition-to-term': {
          timesCorrect: 5,
          timesIncorrect: 0,
          xp: 80,
          lastPracticed: hoursAgo(1),
          consecutiveCorrect: 3,
          longestStreak: 3,
        },
      },
    };
    for (const extra of [{ hintsUsed: 1 }, { isRetry: true }]) {
      const direction = answer(progress, 'perro', extra).wordProgress[word.id].directions?.[
        'definition-to-term'
      ];
      expect(direction?.consecutiveCorrect).toBe(3);
      expect(direction?.longestStreak).toBe(3);
    }
    const unassisted = answer(progress, 'perro').wordProgress[word.id].directions?.[
      'definition-to-term'
    ];
    expect(unassisted?.consecutiveCorrect).toBe(4);
  });
});
