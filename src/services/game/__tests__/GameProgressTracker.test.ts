import { GameProgressTracker } from '../GameProgressTracker';

const word = { id: 'w1', term: 'Hund', definition: 'hond' };
const progress = (over: object) => ({
  w1: {
    wordId: 'w1',
    xp: 0,
    lastPracticed: new Date().toISOString(),
    timesCorrect: 0,
    timesIncorrect: 0,
    ...over,
  },
});

describe('GameProgressTracker.calculateWordLearningStatus', () => {
  const tracker = new GameProgressTracker();

  it('reads mastery from WordProgress.xp (there is no `mastery` field)', () => {
    const status = tracker.calculateWordLearningStatus(word, progress({ xp: 70 }), false);
    expect(status.currentMastery).toBeCloseTo(70, 5);
  });

  it('applies decay using lastPracticed', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();
    const status = tracker.calculateWordLearningStatus(
      word,
      progress({ xp: 70, lastPracticed: twoWeeksAgo }),
      false
    );
    expect(status.currentMastery).toBeLessThan(70);
    expect(status.currentMastery).toBeGreaterThan(0);
  });

  it('does not ask for reinforcement once a word with one past mistake has built mastery', () => {
    // with mastery wrongly read as 0, any past mistake meant "needs reinforcement" forever
    const status = tracker.calculateWordLearningStatus(
      word,
      progress({ xp: 80, timesCorrect: 9, timesIncorrect: 1 }),
      false
    );
    expect(status.needsReinforcement).toBe(false);
  });

  it('still asks for reinforcement for a struggling word with low mastery', () => {
    const status = tracker.calculateWordLearningStatus(
      word,
      progress({ xp: 10, timesCorrect: 3, timesIncorrect: 1 }),
      false
    );
    expect(status.needsReinforcement).toBe(true);
  });
});
