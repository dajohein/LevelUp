import sessionReducer, {
  setLanguage,
  startSession,
  handleAnswerSubmission,
  addCorrectAnswer,
  addIncorrectAnswer,
  completeSession,
  resetSession,
  setWeeklyChallenge,
  sessionTypes,
} from '../sessionSlice';

// Helper to create initial state
const getInitialState = () => sessionReducer(undefined, { type: '@@INIT' });

const quickDash = sessionTypes.find(s => s.id === 'quick-dash')!;

describe('sessionSlice behavior', () => {
  it('setLanguage should initialize language-specific data', () => {
    const state = getInitialState();
    const next = sessionReducer(state, setLanguage('de'));

    expect(next.currentLanguage).toBe('de');
    expect(next.completedSessionsByLanguage['de']).toEqual([]);
    expect(next.weeklyChallengeBylanguage['de']).toMatchObject({
      isActive: false,
      targetScore: 2500,
      currentScore: 0,
      rank: 0,
    });
  });

  it('startSession should activate session and reset progress', () => {
    const state = getInitialState();
    const next = sessionReducer(state, startSession('quick-dash'));

    expect(next.isSessionActive).toBe(true);
    expect(next.currentSession?.id).toBe('quick-dash');
    expect(next.progress.wordsCompleted).toBe(0);
    expect(next.progress.correctAnswers).toBe(0);
    expect(next.progress.incorrectAnswers).toBe(0);
  });

  it('handleAnswerSubmission should update progress on correct answer with bonuses', () => {
    const state = sessionReducer(getInitialState(), startSession('quick-dash'));
    const next = sessionReducer(
      state,
      handleAnswerSubmission({
        isCorrect: true,
        bonuses: { timeBonus: 10, streakBonus: 5 },
        isSessionActive: true,
        currentSession: quickDash,
      })
    );

    expect(next.progress.wordsCompleted).toBe(1);
    expect(next.progress.correctAnswers).toBe(1);
    expect(next.progress.currentStreak).toBe(1);
    expect(next.progress.score).toBe(115); // 100 base + 15 bonuses
    expect(next.progress.bonusPoints).toBe(15);
  });

  it('handleAnswerSubmission should update progress on incorrect answer', () => {
    const state = sessionReducer(getInitialState(), startSession('quick-dash'));
    const next = sessionReducer(
      state,
      handleAnswerSubmission({
        isCorrect: false,
        isSessionActive: true,
        currentSession: quickDash,
      })
    );

    expect(next.progress.incorrectAnswers).toBe(1);
    expect(next.progress.currentStreak).toBe(0);
  });

  it('addCorrectAnswer should apply score multiplier and bonuses', () => {
    // Start a session to set currentSession and active status
    let state = sessionReducer(getInitialState(), startSession('quick-dash'));
    // Build up streak with two correct answers
    state = sessionReducer(state, addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 }));
    state = sessionReducer(state, addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 }));

    const next = sessionReducer(
      state,
      addCorrectAnswer({ timeBonus: 10, streakBonus: 5, contextBonus: 0, perfectRecallBonus: 0 })
    );

    // Base 100 * 1.5 (scoreMultiplier) = 150, no special mode override, +15 bonuses
    expect(next.progress.score).toBeGreaterThanOrEqual(165);
    expect(next.progress.correctAnswers).toBe(3);
    expect(next.progress.currentStreak).toBe(3);
    expect(next.progress.longestStreak).toBe(3);
  });

  it('addIncorrectAnswer should increment incorrect count and reset streak', () => {
    let state = sessionReducer(getInitialState(), startSession('quick-dash'));
    // Build streak via correct answers
    state = sessionReducer(state, addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 }));
    state = sessionReducer(state, addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 }));

    const next = sessionReducer(state, addIncorrectAnswer());

    expect(next.progress.incorrectAnswers).toBe(1);
    expect(next.progress.currentStreak).toBe(0);
    expect(next.progress.sessionFailed).toBe(false);
  });

  it('completeSession should mark success and record completion', () => {
    // Start a boss battle session and set a high score
    let state = sessionReducer(getInitialState(), setLanguage('de'));
    state = sessionReducer(state, startSession('boss-battle'));

    // Accumulate score via addCorrectAnswer actions
    const timesToScore = 20; // enough to exceed required score with multiplier
    for (let i = 0; i < timesToScore; i++) {
      state = sessionReducer(state, addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 }));
    }

    const next = sessionReducer(state, completeSession());

    expect(next.isSessionActive).toBe(false);
    expect(next.completedSessionsByLanguage['de']).toContain('boss-battle');
    expect(next.weeklyChallengeBylanguage['de'].currentScore).toBe(next.progress.score);
  });

  it('resetSession should clear current session and progress', () => {
    let state = sessionReducer(getInitialState(), startSession('quick-dash'));
    state = sessionReducer(state, addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 }));
    const next = sessionReducer(state, resetSession());

    expect(next.currentSession).toBeNull();
    expect(next.isSessionActive).toBe(false);
    expect(next.progress.score).toBe(0);
  });

  it('setWeeklyChallenge should update challenge for language', () => {
    let state = sessionReducer(getInitialState(), setLanguage('de'));
    const next = sessionReducer(
      state,
      setWeeklyChallenge({ languageCode: 'de', isActive: true, targetScore: 3000, rank: 2 })
    );

    expect(next.weeklyChallengeBylanguage['de']).toMatchObject({
      isActive: true,
      targetScore: 3000,
      rank: 2,
    });
  });

  it('setLanguage should preserve existing weekly challenge for the same language', () => {
    let state = sessionReducer(getInitialState(), setLanguage('de'));
    state = sessionReducer(
      state,
      setWeeklyChallenge({ languageCode: 'de', isActive: true, targetScore: 3200, rank: 1 })
    );

    const next = sessionReducer(state, setLanguage('de'));

    expect(next.weeklyChallengeBylanguage['de']).toMatchObject({
      isActive: true,
      targetScore: 3200,
      rank: 1,
    });
  });

  it('should isolate progress and completions per language', () => {
    // Complete a boss battle in German
    let state = sessionReducer(getInitialState(), setLanguage('de'));
    state = sessionReducer(state, startSession('boss-battle'));
    for (let i = 0; i < 7; i++) {
      state = sessionReducer(
        state,
        addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 })
      );
    }
    state = sessionReducer(state, completeSession());
    const germanScore = state.weeklyChallengeBylanguage['de'].currentScore;

    // Switch to Spanish and complete a different session
    state = sessionReducer(state, setLanguage('es'));
    state = sessionReducer(state, startSession('quick-dash'));
    for (let i = 0; i < 4; i++) {
      state = sessionReducer(
        state,
        addCorrectAnswer({ timeBonus: 0, streakBonus: 0, contextBonus: 0, perfectRecallBonus: 0 })
      );
    }
    state = sessionReducer(state, completeSession());

    expect(state.completedSessionsByLanguage['de']).toContain('boss-battle');
    expect(state.completedSessionsByLanguage['es']).toContain('quick-dash');
    expect(state.weeklyChallengeBylanguage['de'].currentScore).toBe(germanScore);
    expect(state.weeklyChallengeBylanguage['es'].currentScore).toBe(0);
  });
});
