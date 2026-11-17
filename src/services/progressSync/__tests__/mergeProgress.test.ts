import {
  MAX_BLOB_BYTES,
  PROGRESS_SCHEMA,
  buildProgressBlob,
  mergeWordProgress,
  parseProgressBlob,
  sameWords,
} from '../mergeProgress';
import type { WordProgress } from '../../../store/types';

const NOW = Date.parse('2025-06-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const entry = (wordId: string, overrides: Partial<WordProgress> = {}): WordProgress => ({
  wordId,
  xp: 10,
  lastPracticed: new Date(NOW - DAY).toISOString(),
  timesCorrect: 1,
  timesIncorrect: 0,
  ...overrides,
});

const iso = (ms: number) => new Date(ms).toISOString();

const direction = (overrides: Record<string, unknown> = {}) => ({
  timesCorrect: 2,
  timesIncorrect: 1,
  xp: 12,
  lastPracticed: iso(NOW - DAY),
  ...overrides,
});

describe('mergeWordProgress', () => {
  it('takes the entry with the later lastPracticed, whole', () => {
    const local = {
      a: entry('a', {
        xp: 90,
        lastPracticed: iso(NOW - 2 * DAY),
        consecutiveCorrect: 5,
        streakUpdatedAt: iso(NOW - 2 * DAY),
        directions: { 'term-to-definition': { xp: 90 } as never },
      }),
    };
    const remote = {
      a: entry('a', {
        xp: 20,
        lastPracticed: iso(NOW - DAY),
        consecutiveCorrect: 1,
        streakUpdatedAt: iso(NOW - DAY),
        directions: { 'definition-to-term': { xp: 20 } as never },
      }),
    };
    const { merged, takenFromRemote } = mergeWordProgress(local, remote, NOW);
    expect(merged.a).toEqual(remote.a);
    expect(merged.a.consecutiveCorrect).toBe(1);
    expect(merged.a.directions).toEqual({ 'definition-to-term': { xp: 20 } });
    expect(merged.a.directions).not.toHaveProperty('term-to-definition');
    expect(takenFromRemote).toBe(1);
  });

  it('keeps the local entry whole when local is later', () => {
    const local = {
      a: entry('a', { xp: 50, lastPracticed: iso(NOW - 1000), consecutiveCorrect: 3 }),
    };
    const remote = {
      a: entry('a', { xp: 99, lastPracticed: iso(NOW - 2000), consecutiveCorrect: 9 }),
    };
    const { merged, takenFromRemote } = mergeWordProgress(local, remote, NOW);
    expect(merged.a).toEqual(local.a);
    expect(takenFromRemote).toBe(0);
  });

  it('breaks a lastPracticed tie by more answers', () => {
    const when = iso(NOW - DAY);
    const local = {
      a: entry('a', { lastPracticed: when, timesCorrect: 2, timesIncorrect: 1, xp: 1 }),
    };
    const remote = {
      a: entry('a', { lastPracticed: when, timesCorrect: 3, timesIncorrect: 1, xp: 2 }),
    };
    expect(mergeWordProgress(local, remote, NOW).merged.a.xp).toBe(2);
    expect(mergeWordProgress(remote, local, NOW).merged.a.xp).toBe(2);
  });

  it('keeps local on a full tie', () => {
    const when = iso(NOW - DAY);
    const local = { a: entry('a', { lastPracticed: when, timesCorrect: 2, xp: 1 }) };
    const remote = { a: entry('a', { lastPracticed: when, timesCorrect: 2, xp: 2 }) };
    const { merged, takenFromRemote } = mergeWordProgress(local, remote, NOW);
    expect(merged.a.xp).toBe(1);
    expect(takenFromRemote).toBe(0);
  });

  it('keeps words that exist on only one side, both ways', () => {
    const local = { a: entry('a') };
    const remote = { b: entry('b') };
    const forward = mergeWordProgress(local, remote, NOW);
    expect(Object.keys(forward.merged).sort()).toEqual(['a', 'b']);
    expect(forward.takenFromRemote).toBe(1);
    const backward = mergeWordProgress(remote, local, NOW);
    expect(Object.keys(backward.merged).sort()).toEqual(['a', 'b']);
  });

  it('never loses a local word, even against an empty remote or a worse entry', () => {
    const local = { a: entry('a'), b: entry('b', { lastPracticed: 'garbage' }) };
    expect(Object.keys(mergeWordProgress(local, {}, NOW).merged).sort()).toEqual(['a', 'b']);
    const remote = { a: entry('a', { lastPracticed: iso(NOW - 10 * DAY) }) };
    expect(Object.keys(mergeWordProgress(local, remote, NOW).merged).sort()).toEqual(['a', 'b']);
  });

  it('treats an unparsable lastPracticed as oldest', () => {
    const bad = entry('a', { lastPracticed: 'not a date', xp: 1 });
    const good = entry('a', { lastPracticed: iso(NOW - 365 * DAY), xp: 2 });
    expect(mergeWordProgress({ a: bad }, { a: good }, NOW).merged.a.xp).toBe(2);
    expect(mergeWordProgress({ a: good }, { a: bad }, NOW).merged.a.xp).toBe(2);
  });

  it('clamps a lastPracticed more than 24h in the future to now', () => {
    const skewed = { a: entry('a', { lastPracticed: iso(NOW + DAY + 1), xp: 1 }) };
    // Clamped to NOW, so an entry practised 1s after NOW (within 24h) is later and wins.
    const within = { a: entry('a', { lastPracticed: iso(NOW + 1000), xp: 3 }) };
    expect(mergeWordProgress(within, skewed, NOW).merged.a.xp).toBe(3);
    expect(mergeWordProgress(skewed, within, NOW).merged.a.xp).toBe(3);
    // Clamped to exactly NOW: ties with an entry at NOW, and more attempts decide.
    const atNow = { a: entry('a', { lastPracticed: iso(NOW), xp: 2, timesCorrect: 0 }) };
    expect(mergeWordProgress(atNow, skewed, NOW).merged.a.xp).toBe(1);
  });

  it('does not clamp a lastPracticed exactly 24h in the future', () => {
    const exact = { a: entry('a', { lastPracticed: iso(NOW + DAY), xp: 1 }) };
    const within = { a: entry('a', { lastPracticed: iso(NOW + 1000), xp: 3 }) };
    // Not clamped: NOW + 24h is later than NOW + 1s, so it wins.
    expect(mergeWordProgress(within, exact, NOW).merged.a.xp).toBe(1);
    expect(mergeWordProgress(exact, within, NOW).merged.a.xp).toBe(1);
  });

  it('does not mutate its inputs and returns copies', () => {
    const local = { a: entry('a', { directions: { 'term-to-definition': { xp: 1 } as never } }) };
    const remote = { a: entry('a', { lastPracticed: iso(NOW) }), b: entry('b') };
    const localSnapshot = JSON.stringify(local);
    const remoteSnapshot = JSON.stringify(remote);
    const { merged } = mergeWordProgress(local, remote, NOW);
    expect(JSON.stringify(local)).toBe(localSnapshot);
    expect(JSON.stringify(remote)).toBe(remoteSnapshot);
    expect(merged.a).not.toBe(remote.a);
    expect(merged.b).not.toBe(remote.b);
    merged.b.xp = 12345;
    expect(remote.b.xp).toBe(10);
  });

  it('ends with the same words whichever side is local when timestamps differ', () => {
    const a = {
      x: entry('x', { lastPracticed: iso(NOW - 3 * DAY), xp: 1 }),
      y: entry('y', { lastPracticed: iso(NOW - DAY), xp: 2 }),
      onlyA: entry('onlyA'),
    };
    const b = {
      x: entry('x', { lastPracticed: iso(NOW - DAY), xp: 3 }),
      y: entry('y', { lastPracticed: iso(NOW - 3 * DAY), xp: 4 }),
      onlyB: entry('onlyB'),
    };
    expect(mergeWordProgress(a, b, NOW).merged).toEqual(mergeWordProgress(b, a, NOW).merged);
  });

  it('ignores forbidden keys from the remote side', () => {
    const remote = JSON.parse(
      '{"__proto__": {"wordId":"__proto__","xp":1,"lastPracticed":"x","timesCorrect":0,"timesIncorrect":0}}'
    );
    const { merged } = mergeWordProgress({}, remote, NOW);
    expect(Object.keys(merged)).toEqual([]);
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
  });
});

describe('parseProgressBlob', () => {
  const blobWith = (words: unknown, schema: unknown = PROGRESS_SCHEMA) => ({
    schema,
    deviceId: 'd',
    updatedAt: iso(NOW),
    words,
  });

  it('accepts a valid blob and returns fresh objects', () => {
    const e = entry('a', { directions: { 'term-to-definition': direction() } });
    const result = parseProgressBlob(blobWith({ a: e }));
    expect(result).toEqual({ words: { a: e }, dropped: 0 });
    expect(result?.words.a).not.toBe(e);
    expect(result?.words.a.directions).not.toBe(e.directions);
  });

  it('rejects a wrong schema, including one past', () => {
    expect(parseProgressBlob(blobWith({}, 2))).toBeNull();
    expect(parseProgressBlob(blobWith({}, 0))).toBeNull();
    expect(parseProgressBlob(blobWith({}, '1'))).toBeNull();
  });

  it('rejects a missing schema', () => {
    expect(parseProgressBlob({ deviceId: 'd', words: {} })).toBeNull();
  });

  it.each([[[]], [null], [undefined], ['{"schema":1,"words":{}}'], [42]])(
    'rejects non-object input %p',
    raw => {
      expect(parseProgressBlob(raw)).toBeNull();
    }
  );

  it.each([[[]], [null], ['x'], [5], [undefined]])(
    'rejects words that is not an object: %p',
    words => {
      expect(parseProgressBlob(blobWith(words))).toBeNull();
    }
  );

  it('drops an entry whose key differs from wordId, and counts it', () => {
    const result = parseProgressBlob(blobWith({ a: entry('b'), c: entry('c') }));
    expect(result?.dropped).toBe(1);
    expect(Object.keys(result?.words ?? {})).toEqual(['c']);
  });

  it.each([
    ['xp', -1],
    ['xp', NaN],
    ['xp', Infinity],
    ['timesCorrect', -0.5],
    ['timesCorrect', Infinity],
    ['timesIncorrect', -1],
    ['timesIncorrect', NaN],
    ['xp', '5'],
  ])('drops an entry with %s = %p', (field, value) => {
    const bad = { ...entry('a'), [field]: value };
    const result = parseProgressBlob(blobWith({ a: bad, b: entry('b') }));
    expect(result?.dropped).toBe(1);
    expect(Object.keys(result?.words ?? {})).toEqual(['b']);
  });

  it('keeps zero values', () => {
    const result = parseProgressBlob(
      blobWith({ a: entry('a', { xp: 0, timesCorrect: 0, timesIncorrect: 0 }) })
    );
    expect(result?.dropped).toBe(0);
  });

  it('drops entries with a non-string lastPracticed or a non-object value', () => {
    const result = parseProgressBlob(
      blobWith({
        a: { ...entry('a'), lastPracticed: 123 },
        b: { ...entry('b'), lastPracticed: null },
        c: null,
        d: 'str',
        e: [],
        f: entry('f'),
      })
    );
    expect(result?.dropped).toBe(5);
    expect(Object.keys(result?.words ?? {})).toEqual(['f']);
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects the %s key without polluting Object.prototype',
    key => {
      const raw = JSON.parse(
        `{"schema":1,"deviceId":"d","updatedAt":"x","words":{"${key}":{"wordId":"${key}","xp":1,"lastPracticed":"x","timesCorrect":1,"timesIncorrect":0},"ok":{"wordId":"ok","xp":1,"lastPracticed":"x","timesCorrect":1,"timesIncorrect":0}}}`
      );
      const result = parseProgressBlob(raw);
      expect(result?.dropped).toBe(1);
      expect(Object.keys(result?.words ?? {})).toEqual(['ok']);
      expect(Object.getPrototypeOf(result?.words)).toBe(Object.prototype);
      expect(({} as Record<string, unknown>).xp).toBeUndefined();
      expect(({} as Record<string, unknown>).wordId).toBeUndefined();
    }
  );

  it('does not pollute Object.prototype through a nested __proto__', () => {
    const raw = JSON.parse(
      '{"schema":1,"words":{"a":{"wordId":"a","xp":1,"lastPracticed":"x","timesCorrect":1,"timesIncorrect":0,"directions":{"__proto__":{"polluted":true}}}}}'
    );
    const result = parseProgressBlob(raw);
    // an unknown direction key makes the entry invalid, so it is dropped rather than kept
    expect(result?.dropped).toBe(1);
    expect(result?.words.a).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  describe('optional fields', () => {
    const parsedWith = (overrides: Record<string, unknown>) =>
      parseProgressBlob(blobWith({ a: { ...entry('a'), ...overrides } }));

    it('accepts every optional field when well formed', () => {
      const full = {
        consecutiveCorrect: 3,
        streakUpdatedAt: iso(NOW),
        totalXp: 40,
        firstLearned: iso(NOW - DAY),
        version: 2,
        learningPhase: 'practice',
        tags: ['a', 'b'],
        customNotes: 'note',
        directions: {
          'term-to-definition': direction({ difficultyLevel: 'hard', longestStreak: 4 }),
          'definition-to-term': direction(),
        },
      };
      expect(parsedWith(full)).toEqual({ words: { a: { ...entry('a'), ...full } }, dropped: 0 });
    });

    it.each([
      ['consecutiveCorrect negative', { consecutiveCorrect: -1 }],
      ['consecutiveCorrect a string', { consecutiveCorrect: '3' }],
      ['streakUpdatedAt a number', { streakUpdatedAt: 5 }],
      ['totalXp NaN', { totalXp: Number.NaN }],
      ['firstLearned an object', { firstLearned: {} }],
      ['version Infinity', { version: Infinity }],
      ['learningPhase unknown', { learningPhase: 'expert' }],
      ['tags not an array', { tags: 'a' }],
      ['tags with a non-string', { tags: ['a', 1] }],
      ['customNotes a number', { customNotes: 1 }],
      ['directions an array', { directions: [] }],
      ['directions with an unknown key', { directions: { other: direction() } }],
      ['a direction missing its counters', { directions: { 'term-to-definition': { xp: 1 } } }],
      [
        'a direction with a negative xp',
        { directions: { 'term-to-definition': direction({ xp: -1 }) } },
      ],
      [
        'a direction with a bad difficulty',
        { directions: { 'term-to-definition': direction({ difficultyLevel: 'x' }) } },
      ],
      [
        'a direction with a non-string streakUpdatedAt',
        { directions: { 'term-to-definition': direction({ streakUpdatedAt: 1 }) } },
      ],
    ])('drops an entry with %s, and keeps the others', (_name, overrides) => {
      const result = parseProgressBlob(
        blobWith({ a: { ...entry('a'), ...overrides }, b: entry('b') })
      );
      expect(result?.dropped).toBe(1);
      expect(Object.keys(result?.words ?? {})).toEqual(['b']);
    });
  });

  const manyWords = (n: number) => {
    const words: Record<string, WordProgress> = {};
    for (let i = 0; i < n; i++) words[`w${i}`] = entry(`w${i}`);
    return words;
  };

  it('accepts exactly 20000 entries', () => {
    const result = parseProgressBlob(blobWith(manyWords(20000)));
    expect(result).not.toBeNull();
    expect(Object.keys(result?.words ?? {})).toHaveLength(20000);
  });

  it('rejects 20001 entries', () => {
    expect(parseProgressBlob(blobWith(manyWords(20001)))).toBeNull();
  });

  it('counts every dropped entry', () => {
    const words = { ...manyWords(3), bad1: { ...entry('bad1'), xp: -1 }, bad2: entry('other') };
    const result = parseProgressBlob(blobWith(words));
    expect(result?.dropped).toBe(2);
    expect(Object.keys(result?.words ?? {})).toHaveLength(3);
  });
});

describe('buildProgressBlob', () => {
  it('builds the blob with schema, device and ISO timestamp', () => {
    const words = { a: entry('a') };
    const { blob } = buildProgressBlob(words, 'device-1', NOW);
    expect(blob).toEqual({
      schema: PROGRESS_SCHEMA,
      deviceId: 'device-1',
      updatedAt: iso(NOW),
      words,
    });
  });

  it('reports the exact UTF-8 byte length of the JSON', () => {
    const { blob, bytes } = buildProgressBlob({ a: entry('a') }, 'device-1', NOW);
    expect(bytes).toBe(Buffer.byteLength(JSON.stringify(blob), 'utf8'));
  });

  it('counts multi-byte characters as bytes, not characters', () => {
    const word = 'żółć-日本語-😀';
    const { blob, bytes } = buildProgressBlob({ [word]: entry(word) }, 'dévice', NOW);
    const json = JSON.stringify(blob);
    expect(bytes).toBe(Buffer.byteLength(json, 'utf8'));
    expect(bytes).toBeGreaterThan(json.length);
  });

  it('exposes the 900 KiB limit', () => {
    expect(MAX_BLOB_BYTES).toBe(921600);
  });
});

describe('sameWords', () => {
  it('is true for the same content in any key order, at any depth', () => {
    const a = {
      x: entry('x', { directions: { 'term-to-definition': direction() } }),
      y: entry('y'),
    };
    const b = {
      y: JSON.parse(JSON.stringify(entry('y'))),
      x: JSON.parse(
        JSON.stringify(entry('x', { directions: { 'term-to-definition': direction() } }))
      ),
    };
    expect(sameWords(a, b)).toBe(true);
    expect(sameWords({}, {})).toBe(true);
  });

  it('is false when a word, a value or a nested value differs', () => {
    expect(sameWords({ x: entry('x') }, {})).toBe(false);
    expect(sameWords({ x: entry('x') }, { x: entry('x', { xp: 11 }) })).toBe(false);
    expect(
      sameWords(
        { x: entry('x', { directions: { 'term-to-definition': direction() } }) },
        { x: entry('x', { directions: { 'term-to-definition': direction({ xp: 13 }) } }) }
      )
    ).toBe(false);
    expect(sameWords({ x: entry('x') }, { z: entry('z') })).toBe(false);
  });
});
