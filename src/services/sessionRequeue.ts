/**
 * Re-queue missed words within a session: a word answered wrongly comes back a few
 * positions later, once, in an easier (recognition) mode. Retrieval shortly after a
 * failure is one of the most effective ways to consolidate the correct answer.
 */

/** How many words later a missed word returns. */
export const REQUEUE_GAP = 3;

export interface QueueEntry<W extends { id: string }, M extends string = string> {
  word: W;
  quizMode: M;
  type: 'group' | 'review';
  difficulty?: number;
  /** Set on a re-queued entry. Retries are practice, so they earn no mastery. */
  isRetry?: boolean;
}

/**
 * Returns the queue with a retry of the entry at `currentIndex` inserted `gap` positions after
 * it (clamped to the end) in `retryMode`, or a copy of the queue if it was a retry / was already
 * re-queued.
 * `requeued` is updated in place so each word is retried at most once per session.
 */
export function requeueMissedWord<W extends { id: string }, M extends string>(
  queue: ReadonlyArray<QueueEntry<W, M>>,
  currentIndex: number,
  requeued: Set<string>,
  retryMode: M,
  gap: number = REQUEUE_GAP
): Array<QueueEntry<W, M>> {
  const missed = queue[currentIndex];
  if (!missed || missed.isRetry || requeued.has(missed.word.id)) {
    return [...queue];
  }

  requeued.add(missed.word.id);
  const retry: QueueEntry<W, M> = { ...missed, quizMode: retryMode, isRetry: true };
  const insertAt = Math.min(currentIndex + 1 + gap, queue.length);
  return [...queue.slice(0, insertAt), retry, ...queue.slice(insertAt)];
}

/**
 * Identity of one asked question, used to scope feedback (selected answer, correct/incorrect)
 * to the attempt it belongs to. A retry has the same word and question text as the original, so
 * it needs its own identity. Otherwise a retry that directly follows the original (the last
 * word of the queue) would inherit the previous attempt's highlighted answer. The prefix (rather
 * than a suffix) keeps the original's key from being a prefix of the retry's key, because feedback
 * keys are matched with `startsWith`.
 */
export const getQuestionKey = (wordId: string, question: string, isRetry = false): string =>
  `${isRetry ? 'retry:' : ''}${wordId}-${question}`;
