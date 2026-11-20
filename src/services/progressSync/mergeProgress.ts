import type { WordProgress } from '../../store/types';

/** Wire format version of the progress blob. */
export const PROGRESS_SCHEMA = 1;

/** Client-side upload limit (server cap is 1 MiB). */
export const MAX_BLOB_BYTES = 900 * 1024;

/** Most words accepted in one downloaded blob. */
const MAX_WORDS = 20000;

/** A lastPracticed further in the future than this is a skewed clock, not a practice time. */
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

/** Largest count or XP value accepted from the server (real values are far smaller). */
const MAX_COUNT = 1e9;
const MAX_STRING = 200;
const MAX_NOTES = 2000;
const MAX_TAGS = 50;

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface ProgressBlob {
  schema: typeof PROGRESS_SCHEMA;
  deviceId: string;
  /** ISO timestamp of the upload. */
  updatedAt: string;
  words: { [wordId: string]: WordProgress };
}

type WordMap = { [wordId: string]: WordProgress };

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep copy of JSON-shaped data, so results never share objects with their inputs. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Practice time in ms; unparsable is the oldest possible. */
const practiceTime = (lastPracticed: unknown): number => {
  if (typeof lastPracticed !== 'string') return -Infinity;
  const time = Date.parse(lastPracticed);
  return Number.isNaN(time) ? -Infinity : time;
};

/**
 * The two times to compare. A time more than 24 h in the future comes from a skewed clock and must
 * not win just because of it, however the skew arose: against a sane time it counts as a tie
 * (the answer count then decides), so it can neither overwrite fresher answers nor be ignored.
 * If both are skewed, their own values are compared.
 */
const comparableTimes = (local: unknown, remote: unknown, now: number): [number, number] => {
  const limit = now + MAX_FUTURE_SKEW_MS;
  const l = practiceTime(local);
  const r = practiceTime(remote);
  const lSkewed = l > limit;
  const rSkewed = r > limit;
  if (rSkewed && !lSkewed) return [l, l];
  if (lSkewed && !rSkewed) return [r, r];
  return [l, r];
};

const attempts = (entry: WordProgress): number => {
  const total = entry.timesCorrect + entry.timesIncorrect;
  return Number.isFinite(total) ? total : 0;
};

/**
 * Merge remote progress into local progress, per word. The entry with the later
 * lastPracticed wins and is taken whole; a tie goes to more answers; a full tie keeps
 * local. Words on only one side are kept. No local word is ever dropped. Inputs are not
 * mutated. `takenFromRemote` counts remote-only words plus words where remote won. A
 * lastPracticed more than 24 h in the future (a skewed clock) never wins by that alone.
 */
export const mergeWordProgress = (
  local: WordMap,
  remote: WordMap,
  now: number = Date.now()
): { merged: WordMap; takenFromRemote: number } => {
  const merged: WordMap = {};
  for (const key of Object.keys(local)) {
    merged[key] = clone(local[key]);
  }

  let takenFromRemote = 0;
  for (const key of Object.keys(remote)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    const remoteEntry = remote[key];
    if (!hasOwn(merged, key)) {
      merged[key] = clone(remoteEntry);
      takenFromRemote++;
      continue;
    }
    const localEntry = merged[key];
    const [localTime, remoteTime] = comparableTimes(
      localEntry.lastPracticed,
      remoteEntry.lastPracticed,
      now
    );
    const remoteWins =
      remoteTime > localTime ||
      (remoteTime === localTime && attempts(remoteEntry) > attempts(localEntry));
    if (remoteWins) {
      merged[key] = clone(remoteEntry);
      takenFromRemote++;
    }
  }
  return { merged, takenFromRemote };
};

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_COUNT;

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= MAX_STRING;

const LEARNING_PHASES = new Set(['introduction', 'practice', 'mastery', 'maintenance']);
const DIRECTION_KEYS = ['term-to-definition', 'definition-to-term'];
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

/** One direction's progress: the fields the app reads must have the right type. */
const isValidDirection = (value: unknown): boolean =>
  isPlainObject(value) &&
  isCount(value.timesCorrect) &&
  isCount(value.timesIncorrect) &&
  isCount(value.xp) &&
  isString(value.lastPracticed) &&
  (value.averageResponseTime === undefined || isCount(value.averageResponseTime)) &&
  (value.consecutiveCorrect === undefined || isCount(value.consecutiveCorrect)) &&
  (value.streakUpdatedAt === undefined || isString(value.streakUpdatedAt)) &&
  (value.longestStreak === undefined || isCount(value.longestStreak)) &&
  (value.difficultyLevel === undefined || DIFFICULTIES.has(value.difficultyLevel as string));

/** The optional fields of a word entry: when present they must be usable by the app. */
const hasValidOptionalFields = (entry: Record<string, unknown>): boolean => {
  if (entry.consecutiveCorrect !== undefined && !isCount(entry.consecutiveCorrect)) return false;
  if (entry.streakUpdatedAt !== undefined && !isString(entry.streakUpdatedAt)) return false;
  if (entry.totalXp !== undefined && !isCount(entry.totalXp)) return false;
  if (entry.firstLearned !== undefined && !isString(entry.firstLearned)) return false;
  if (entry.version !== undefined && !isCount(entry.version)) return false;
  if (
    entry.customNotes !== undefined &&
    !(typeof entry.customNotes === 'string' && entry.customNotes.length <= MAX_NOTES)
  ) {
    return false;
  }
  if (entry.learningPhase !== undefined && !LEARNING_PHASES.has(entry.learningPhase as string)) {
    return false;
  }
  if (
    entry.tags !== undefined &&
    !(Array.isArray(entry.tags) && entry.tags.length <= MAX_TAGS && entry.tags.every(isString))
  ) {
    return false;
  }
  if (entry.directions !== undefined) {
    if (!isPlainObject(entry.directions)) return false;
    for (const key of Object.keys(entry.directions)) {
      if (!DIRECTION_KEYS.includes(key)) return false;
      if (!isValidDirection(entry.directions[key])) return false;
    }
  }
  return true;
};

const ENTRY_FIELDS = [
  'wordId',
  'xp',
  'lastPracticed',
  'timesCorrect',
  'timesIncorrect',
  'consecutiveCorrect',
  'streakUpdatedAt',
  'totalXp',
  'firstLearned',
  'version',
  'learningPhase',
  'tags',
  'customNotes',
] as const;
const DIRECTION_FIELDS = [
  'timesCorrect',
  'timesIncorrect',
  'xp',
  'lastPracticed',
  'averageResponseTime',
  'consecutiveCorrect',
  'streakUpdatedAt',
  'longestStreak',
  'difficultyLevel',
] as const;

/** Copy only the fields the app knows (an already validated entry), so unknown extras never persist. */
const pickKnownFields = (entry: Record<string, unknown>): WordProgress => {
  const out: Record<string, unknown> = {};
  for (const field of ENTRY_FIELDS) {
    if (entry[field] !== undefined) out[field] = clone(entry[field]);
  }
  if (isPlainObject(entry.directions)) {
    const directions: Record<string, unknown> = {};
    for (const key of DIRECTION_KEYS) {
      const direction = entry.directions[key];
      if (!isPlainObject(direction)) continue;
      const picked: Record<string, unknown> = {};
      for (const field of DIRECTION_FIELDS) {
        if (direction[field] !== undefined) picked[field] = direction[field];
      }
      directions[key] = picked;
    }
    out.directions = directions;
  }
  return out as unknown as WordProgress;
};

/**
 * Validate a downloaded blob. Returns null when the blob as a whole is unusable (not an
 * object, wrong or missing schema, `words` not an object, more than 20000 entries); the
 * caller logs. Invalid entries are dropped one by one and counted. Returned entries are
 * fresh objects.
 */
export const parseProgressBlob = (raw: unknown): { words: WordMap; dropped: number } | null => {
  if (!isPlainObject(raw)) return null;
  if (raw.schema !== PROGRESS_SCHEMA) return null;
  const rawWords = raw.words;
  if (!isPlainObject(rawWords)) return null;

  const keys = Object.keys(rawWords);
  if (keys.length > MAX_WORDS) return null;

  const words: WordMap = {};
  let dropped = 0;
  for (const key of keys) {
    const entry = rawWords[key];
    if (
      FORBIDDEN_KEYS.has(key) ||
      !isPlainObject(entry) ||
      entry.wordId !== key ||
      !isCount(entry.xp) ||
      !isCount(entry.timesCorrect) ||
      !isCount(entry.timesIncorrect) ||
      !isString(entry.lastPracticed) ||
      !hasValidOptionalFields(entry)
    ) {
      dropped++;
      continue;
    }
    words[key] = pickKnownFields(entry);
  }
  return { words, dropped };
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

/** True when both maps hold exactly the same words with the same contents (key order ignored). */
export const sameWords = (a: WordMap, b: WordMap): boolean =>
  stableStringify(a) === stableStringify(b);

/** Build the upload blob and its exact UTF-8 size. */
export const buildProgressBlob = (
  words: WordMap,
  deviceId: string,
  now: number = Date.now()
): { blob: ProgressBlob; bytes: number } => {
  const blob: ProgressBlob = {
    schema: PROGRESS_SCHEMA,
    deviceId,
    updatedAt: new Date(now).toISOString(),
    words,
  };
  return { blob, bytes: new TextEncoder().encode(JSON.stringify(blob)).length };
};
