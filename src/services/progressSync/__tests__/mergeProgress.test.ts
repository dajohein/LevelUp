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

  describe('future clock (skew) rule', () => {
    const SKEW = NOW + DAY + 1; // 24h + 1ms ahead: skewed
    const sane = NOW - DAY;
    const withTimes = (lastPracticed: number, xp: number, timesCorrect: number) => ({
      a: entry('a', { lastPracticed: iso(lastPracticed), xp, timesCorrect, timesIncorrect: 0 }),
    });

    it('a skewed remote with MORE answers than a sane local wins on the tie', () => {
      const { merged, takenFromRemote } = mergeWordProgress(
        withTimes(sane, 1, 2),
        withTimes(SKEW, 2, 3),
        NOW
      );
      expect(merged.a.xp).toBe(2);
      expect(takenFromRemote).toBe(1);
    });

    it('a skewed remote with FEWER answers cannot overwrite a sane local', () => {
      const { merged, takenFromRemote } = mergeWordProgress(
        withTimes(sane, 1, 3),
        withTimes(SKEW, 2, 2),
        NOW
      );
      expect(merged.a.xp).toBe(1);
      expect(takenFromRemote).toBe(0);
    });

    it('a skewed remote with EQUAL answers cannot overwrite a sane local', () => {
      const { merged, takenFromRemote } = mergeWordProgress(
        withTimes(sane, 1, 2),
        withTimes(SKEW, 2, 2),
        NOW
      );
      expect(merged.a.xp).toBe(1);
      expect(takenFromRemote).toBe(0);
    });

    it('a skewed remote cannot beat a local practised just after now (within 24h)', () => {
      const { merged } = mergeWordProgress(withTimes(NOW + 1000, 1, 5), withTimes(SKEW, 2, 2), NOW);
      expect(merged.a.xp).toBe(1);
    });

    it('a skewed local with FEWER answers than a sane remote is replaced', () => {
      const { merged, takenFromRemote } = mergeWordProgress(
        withTimes(SKEW, 1, 2),
        withTimes(sane, 2, 3),
        NOW
      );
      expect(merged.a.xp).toBe(2);
      expect(takenFromRemote).toBe(1);
    });

    it('a skewed local with MORE answers than a sane remote is kept', () => {
      const { merged, takenFromRemote } = mergeWordProgress(
        withTimes(SKEW, 1, 3),
        withTimes(sane, 2, 2),
        NOW
      );
      expect(merged.a.xp).toBe(1);
      expect(takenFromRemote).toBe(0);
    });

    it('a skewed local with EQUAL answers than a sane remote is kept', () => {
      const { merged, takenFromRemote } = mergeWordProgress(
        withTimes(SKEW, 1, 2),
        withTimes(sane, 2, 2),
        NOW
      );
      expect(merged.a.xp).toBe(1);
      expect(takenFromRemote).toBe(0);
    });

    it('when both are skewed, the later value wins whatever the answer counts', () => {
      const earlier = withTimes(NOW + 3 * DAY, 1, 9);
      const later = withTimes(NOW + 3 * DAY + 1, 2, 1);
      expect(mergeWordProgress(earlier, later, NOW).merged.a.xp).toBe(2);
      expect(mergeWordProgress(later, earlier, NOW).merged.a.xp).toBe(2);
    });

    it('exactly 24h ahead is not skewed: its real value is compared', () => {
      // remote at NOW+24h has FEWER answers but is genuinely later than local at NOW+1s
      const exactRemote = mergeWordProgress(
        withTimes(NOW + 1000, 1, 5),
        withTimes(NOW + DAY, 2, 1),
        NOW
      );
      expect(exactRemote.merged.a.xp).toBe(2);
      // as local: a real later value is kept against a sane remote with more answers
      const exactLocal = mergeWordProgress(
        withTimes(NOW + DAY, 1, 1),
        withTimes(NOW + 1000, 2, 5),
        NOW
      );
      expect(exactLocal.merged.a.xp).toBe(1);
    });

    it('24h + 1ms ahead is skewed: it counts as a tie, so fewer answers lose', () => {
      const skewedRemote = mergeWordProgress(
        withTimes(NOW + 1000, 1, 5),
        withTimes(NOW + DAY + 1, 2, 1),
        NOW
      );
      expect(skewedRemote.merged.a.xp).toBe(1);
      const skewedLocal = mergeWordProgress(
        withTimes(NOW + DAY + 1, 1, 1),
        withTimes(NOW + 1000, 2, 5),
        NOW
      );
      expect(skewedLocal.merged.a.xp).toBe(2);
    });
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

  describe('value caps', () => {
    const parsedWith = (overrides: Record<string, unknown>) =>
      parseProgressBlob(blobWith({ a: { ...entry('a'), ...overrides }, b: entry('b') }));
    const expectKept = (overrides: Record<string, unknown>) => {
      const result = parsedWith(overrides);
      expect(result?.dropped).toBe(0);
      expect(Object.keys(result?.words ?? {})).toEqual(['a', 'b']);
    };
    const expectDropped = (overrides: Record<string, unknown>) => {
      const result = parsedWith(overrides);
      expect(result?.dropped).toBe(1);
      expect(Object.keys(result?.words ?? {})).toEqual(['b']);
    };
    const MAX = 1e9;
    const dirWith = (overrides: Record<string, unknown>) => ({
      directions: { 'term-to-definition': direction(overrides) },
    });

    it.each(['xp', 'timesCorrect', 'timesIncorrect', 'consecutiveCorrect', 'totalXp', 'version'])(
      'accepts %s = 1e9 and drops 1e9 + 1',
      field => {
        expectKept({ [field]: MAX });
        expectDropped({ [field]: MAX + 1 });
      }
    );

    it.each([
      'xp',
      'timesCorrect',
      'timesIncorrect',
      'consecutiveCorrect',
      'longestStreak',
      'averageResponseTime',
    ])('accepts a direction %s = 1e9 and drops 1e9 + 1', field => {
      expectKept(dirWith({ [field]: MAX }));
      expectDropped(dirWith({ [field]: MAX + 1 }));
    });

    it.each([
      ['lastPracticed', (s: string) => ({ lastPracticed: s })],
      ['streakUpdatedAt', (s: string) => ({ streakUpdatedAt: s })],
      ['firstLearned', (s: string) => ({ firstLearned: s })],
      ['a tags item', (s: string) => ({ tags: ['ok', s] })],
      ['a direction lastPracticed', (s: string) => dirWith({ lastPracticed: s })],
      ['a direction streakUpdatedAt', (s: string) => dirWith({ streakUpdatedAt: s })],
    ])('accepts %s of 200 characters and drops 201', (_name, build) => {
      expectKept(build('x'.repeat(200)));
      expectDropped(build('x'.repeat(201)));
    });

    it('accepts customNotes of 2000 characters and drops 2001', () => {
      expectKept({ customNotes: 'n'.repeat(2000) });
      expectDropped({ customNotes: 'n'.repeat(2001) });
    });

    it('accepts 50 tags and drops 51', () => {
      expectKept({ tags: Array.from({ length: 50 }, (_v, i) => `t${i}`) });
      expectDropped({ tags: Array.from({ length: 51 }, (_v, i) => `t${i}`) });
    });
  });

  describe('known-field allow-list', () => {
    const KNOWN = ['wordId', 'xp', 'lastPracticed', 'timesCorrect', 'timesIncorrect'];

    it('does not copy unknown top-level keys, and keeps the entry', () => {
      const big = 'z'.repeat(1024 * 1024);
      const result = parseProgressBlob(
        blobWith({ a: { ...entry('a'), junk: 'x', bigJunk: big, nested: { deep: 1 } } })
      );
      expect(result?.dropped).toBe(0);
      expect(Object.keys(result?.words.a ?? {}).sort()).toEqual([...KNOWN].sort());
      expect(result?.words.a).toEqual(entry('a'));
      expect(JSON.stringify(result).length).toBeLessThan(1000);
    });

    it('does not copy an own __proto__ key inside an entry, and does not pollute', () => {
      const raw = JSON.parse(
        '{"schema":1,"words":{"a":{"wordId":"a","xp":1,"lastPracticed":"x","timesCorrect":1,"timesIncorrect":0,"__proto__":{"polluted":true}}}}'
      );
      const result = parseProgressBlob(raw);
      expect(result?.dropped).toBe(0);
      expect(Object.keys(result?.words.a ?? {}).sort()).toEqual([...KNOWN].sort());
      expect(Object.getPrototypeOf(result?.words.a)).toBe(Object.prototype);
      expect((result?.words.a as unknown as Record<string, unknown>).polluted).toBeUndefined();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('does not copy unknown keys inside a direction entry', () => {
      const raw = JSON.parse(
        JSON.stringify({
          schema: 1,
          words: {
            a: {
              ...entry('a'),
              directions: {
                'term-to-definition': { ...direction(), junk: 'x', big: 'y'.repeat(5000) },
              },
            },
          },
        }).replace('"junk"', '"__proto__":{"polluted":true},"junk"')
      );
      const result = parseProgressBlob(raw);
      expect(result?.dropped).toBe(0);
      const picked = result?.words.a.directions?.['term-to-definition'];
      expect(Object.keys(picked ?? {}).sort()).toEqual(
        ['lastPracticed', 'timesCorrect', 'timesIncorrect', 'xp'].sort()
      );
      expect(picked).toEqual(direction());
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
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
