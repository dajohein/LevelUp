// UI Constants
export const UI_CONSTANTS = {
  // Timing
  DEBOUNCE_DELAY: 1000,
  ANIMATION_DURATION: 300,

  // Scoring
  BASE_SCORE: 10,
  STREAK_BONUS_THRESHOLD: 5,
  PERFECT_ACCURACY_BONUS: 100,
  CONTEXT_BONUS: 30,
  MAX_SPEED_BONUS: 50,

  // Session Targets
  QUICK_SESSION: {
    TARGET_WORDS: 10,
    TIME_LIMIT: 5,
    REQUIRED_SCORE: 600,
  },
  INTENSIVE_SESSION: {
    TARGET_WORDS: 20,
    TIME_LIMIT: 15,
    REQUIRED_SCORE: 1400,
  },

  // Progress Thresholds
  MASTERY_THRESHOLDS: {
    STRUGGLING: 30,
    LEARNING: 70,
    LEARNED: 90,
  },

  // Achievement Thresholds
  ACHIEVEMENT_SCORE_MILESTONE: 100,

  // Storage
  STORAGE_KB_CONVERSION: 1024,
  DECIMAL_PLACES: 100,

  // UI Dimensions
  BORDER_RADIUS: {
    SMALL: '12px',
    MEDIUM: '16px',
    LARGE: '20px',
  },

  // Colors (consider moving to theme)
  RGBA_COLORS: {
    PRIMARY_LIGHT: 'rgba(59, 130, 246, 0.1)',
    PRIMARY_BORDER: 'rgba(59, 130, 246, 0.2)',
    WHITE_OVERLAY: 'rgba(255, 255, 255, 0.1)',
  },
} as const;
