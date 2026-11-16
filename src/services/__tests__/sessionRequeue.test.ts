import { QueueEntry, REQUEUE_GAP, requeueMissedWord } from '../sessionRequeue';

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
