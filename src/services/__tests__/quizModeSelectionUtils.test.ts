import {
  getWordMasteryTier,
  generateQuizModeForMastery,
  selectQuizMode,
  StandardQuizMode,
} from '../quizModeSelectionUtils';

// Mock logger to silence output
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const VALID_MODES: StandardQuizMode[] = [
  'multiple-choice',
  'letter-scramble',
  'open-answer',
  'fill-in-the-blank',
];

function isValidMode(mode: string): boolean {
  return VALID_MODES.includes(mode as StandardQuizMode);
}

// ---------------------------------------------------------------------------
// getWordMasteryTier
// ---------------------------------------------------------------------------
describe('getWordMasteryTier', () => {
  it('returns tier 1 for new word (XP = 0)', () => {
    expect(getWordMasteryTier(0)).toBe(1);
  });

  it('returns tier 1 for XP up to 20', () => {
    expect(getWordMasteryTier(1)).toBe(1);
    expect(getWordMasteryTier(20)).toBe(1);
  });

  it('returns tier 2 for XP 21–50', () => {
    expect(getWordMasteryTier(21)).toBe(2);
    expect(getWordMasteryTier(50)).toBe(2);
  });

  it('returns tier 3 for XP 51–100', () => {
    expect(getWordMasteryTier(51)).toBe(3);
    expect(getWordMasteryTier(100)).toBe(3);
  });

  it('returns tier 4 for XP 101–200', () => {
    expect(getWordMasteryTier(101)).toBe(4);
    expect(getWordMasteryTier(200)).toBe(4);
  });

  it('returns tier 5 for XP above 200', () => {
    expect(getWordMasteryTier(201)).toBe(5);
    expect(getWordMasteryTier(1000)).toBe(5);
  });

  it('tier increases monotonically as XP grows', () => {
    const xpValues = [0, 10, 25, 60, 150, 300];
    const tiers = xpValues.map(xp => getWordMasteryTier(xp));
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// generateQuizModeForMastery
// ---------------------------------------------------------------------------
describe('generateQuizModeForMastery', () => {
  it('always returns a valid StandardQuizMode', () => {
    for (let tier = 1; tier <= 5; tier++) {
      for (let i = 0; i < 20; i++) {
        expect(isValidMode(generateQuizModeForMastery(tier))).toBe(true);
      }
    }
  });

  it('tier 1 never returns open-answer or fill-in-the-blank', () => {
    const easyModes = new Set(['multiple-choice', 'letter-scramble']);
    for (let i = 0; i < 50; i++) {
      const mode = generateQuizModeForMastery(1);
      expect(easyModes.has(mode)).toBe(true);
    }
  });

  it('tier 2 never returns open-answer or fill-in-the-blank', () => {
    const easyModes = new Set(['multiple-choice', 'letter-scramble']);
    for (let i = 0; i < 50; i++) {
      const mode = generateQuizModeForMastery(2);
      expect(easyModes.has(mode)).toBe(true);
    }
  });

  it('tier 3 with allowOpenAnswer=false never returns open-answer', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateQuizModeForMastery(3, false)).not.toBe('open-answer');
    }
  });

  it('tier 3 with allowOpenAnswer=true can return open-answer', () => {
    // Run many times to hit the probability; should appear at least once in 200 trials
    const modes = Array.from({ length: 200 }, () => generateQuizModeForMastery(3, true));
    expect(modes).toContain('open-answer');
  });

  it('tier 4 can return fill-in-the-blank', () => {
    const modes = Array.from({ length: 200 }, () => generateQuizModeForMastery(4));
    expect(modes).toContain('fill-in-the-blank');
  });

  it('tier 5 can return fill-in-the-blank', () => {
    const modes = Array.from({ length: 200 }, () => generateQuizModeForMastery(5));
    expect(modes).toContain('fill-in-the-blank');
  });

  it('higher tiers are less likely to return multiple-choice (easier mode)', () => {
    const trials = 1000;
    const countMC = (tier: number) =>
      Array.from({ length: trials }, () => generateQuizModeForMastery(tier)).filter(
        m => m === 'multiple-choice'
      ).length;

    // Tier 1 should heavily favour multiple-choice; tier 5 should rarely use it
    expect(countMC(1)).toBeGreaterThan(countMC(5));
  });
});

// ---------------------------------------------------------------------------
// selectQuizMode
// ---------------------------------------------------------------------------
describe('selectQuizMode', () => {
  const mockWord = { id: 'word-1', term: 'Hund', definition: 'dog' };

  function buildWordProgress(xp: number) {
    return {
      [mockWord.id]: {
        wordId: mockWord.id,
        xp,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 0,
        timesIncorrect: 0,
      },
    };
  }

  it('always returns a valid StandardQuizMode', () => {
    const xpValues = [0, 10, 30, 75, 150, 300];
    xpValues.forEach(xp => {
      const mode = selectQuizMode({ word: mockWord, wordProgress: buildWordProgress(xp) });
      expect(isValidMode(mode)).toBe(true);
    });
  });

  it('returns multiple-choice in high-pressure context for low-XP word', () => {
    const progress = buildWordProgress(10); // below 50 XP threshold
    for (let i = 0; i < 20; i++) {
      const mode = selectQuizMode({
        word: mockWord,
        wordProgress: progress,
        context: 'high-pressure',
      });
      expect(mode).toBe('multiple-choice');
    }
  });

  it('high-pressure does not force multiple-choice for high-XP words (XP >= 50)', () => {
    const progress = buildWordProgress(60);
    const modes = Array.from({ length: 50 }, () =>
      selectQuizMode({
        word: mockWord,
        wordProgress: progress,
        context: 'high-pressure',
      })
    );
    // Should not be exclusively multiple-choice (probability allows other modes)
    const uniqueModes = new Set(modes);
    expect(uniqueModes.size).toBeGreaterThan(1);
  });

  it('boss-battle context can produce harder modes for high-XP words', () => {
    const progress = buildWordProgress(150); // above 100 XP threshold
    const modes = Array.from({ length: 200 }, () =>
      selectQuizMode({
        word: mockWord,
        wordProgress: progress,
        context: 'boss-battle',
      })
    );
    // Should include some harder modes
    expect(modes.some(m => m === 'fill-in-the-blank' || m === 'open-answer')).toBe(true);
  });

  it('uses multiple-choice as default when word has no progress record', () => {
    // No progress entry means XP defaults to 0 → tier 1 → easy modes
    const mode = selectQuizMode({ word: mockWord, wordProgress: {} });
    expect(['multiple-choice', 'letter-scramble']).toContain(mode);
  });

  it('respects allowOpenAnswer=false across contexts', () => {
    const progress = buildWordProgress(150); // high XP that would normally get open-answer
    for (let i = 0; i < 100; i++) {
      const mode = selectQuizMode({
        word: mockWord,
        wordProgress: progress,
        allowOpenAnswer: false,
      });
      expect(mode).not.toBe('open-answer');
    }
  });
});
