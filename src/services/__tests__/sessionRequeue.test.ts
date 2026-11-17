import { getQuestionKey, QueueEntry, REQUEUE_GAP, requeueMissedWord } from '../sessionRequeue';

type W = { id: string };
const entry = (id: string, quizMode = 'open-answer'): QueueEntry<W> => ({
  word: { id },
  quizMode,
  type: 'group',
});
const ids = (queue: Array<QueueEntry<W>>) => queue.map(e => e.word.id);

describe('requeueMissedWord', () => {
  const queue = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => entry(id));

  it('inserts a retry REQUEUE_GAP words later in recognition mode', () => {
    const result = requeueMissedWord(queue, 1, new Set(), 'multiple-choice');

    expect(REQUEUE_GAP).toBe(3);
    expect(ids(result)).toEqual(['a', 'b', 'c', 'd', 'e', 'b', 'f']);
    expect(result[5]).toMatchObject({ quizMode: 'multiple-choice', isRetry: true });
    expect(queue).toHaveLength(6); // input is not mutated
  });

  it('clamps to the end of the queue', () => {
    const result = requeueMissedWord(queue, 5, new Set(), 'multiple-choice');
    expect(ids(result)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'f']);
  });

  it('retries a word at most once per session', () => {
    const requeued = new Set<string>();
    const once = requeueMissedWord(queue, 0, requeued, 'multiple-choice');
    const retryIndex = once.findIndex(e => e.isRetry);

    // missing the retry itself does not queue another one
    expect(ids(requeueMissedWord(once, retryIndex, requeued, 'multiple-choice'))).toEqual(
      ids(once)
    );
    // missing the same word again via a different entry does not either
    expect(ids(requeueMissedWord(queue, 0, requeued, 'multiple-choice'))).toEqual(ids(queue));
  });

  it('ignores an out-of-range index', () => {
    expect(ids(requeueMissedWord(queue, 99, new Set(), 'multiple-choice'))).toEqual(ids(queue));
  });
});

describe('getQuestionKey', () => {
  it('gives a retry its own identity even for the same word and question', () => {
    const original = getQuestionKey('w1', 'hond');
    const retry = getQuestionKey('w1', 'hond', true);
    expect(retry).not.toBe(original);
  });

  it('keeps feedback of one attempt from matching the other (feedback keys use startsWith)', () => {
    const originalFeedback = `${getQuestionKey('w1', 'hond')}-1700000000000`;
    const retryFeedback = `${getQuestionKey('w1', 'hond', true)}-1700000000001`;

    expect(originalFeedback.startsWith(getQuestionKey('w1', 'hond', true))).toBe(false);
    expect(retryFeedback.startsWith(getQuestionKey('w1', 'hond'))).toBe(false);
    expect(originalFeedback.startsWith(getQuestionKey('w1', 'hond'))).toBe(true);
  });

  it('is stable for non-retries', () => {
    expect(getQuestionKey('w1', 'hond')).toBe(getQuestionKey('w1', 'hond', false));
    expect(getQuestionKey('w1', 'hond')).toBe(getQuestionKey('w1', 'hond'));
  });

  it('cannot confuse a hyphenated id with a hyphenated question', () => {
    expect(getQuestionKey('a', 'b-c')).not.toBe(getQuestionKey('a-b', 'c'));
  });
});

describe('requeueMissedWord gap safety', () => {
  const queue = ['w1', 'w2', 'w3'].map(id => entry(id));

  it('never places the retry before the word just missed, whatever the gap', () => {
    for (const gap of [NaN, -5, Infinity * -1]) {
      const result = requeueMissedWord(queue, 1, new Set(), 'multiple-choice', gap);
      const retryIndex = result.findIndex(e => e.isRetry);
      expect(retryIndex).toBeGreaterThan(1);
    }
  });
});
