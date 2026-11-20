/**
 * Accessible backgrounds for controls that show white text on a difficulty colour
 * (practice buttons, module difficulty badges). Every colour reaches WCAG AA
 * (4.5:1) against white, so the text stays readable at any size, including the
 * gradient end points. Difficulty is also always shown as a text label.
 */
export const DIFFICULTY_TEXT_COLOR = '#ffffff';

export type DifficultyColors = { start: string; end: string };

export const DIFFICULTY_COLORS: Record<string, DifficultyColors> = {
  beginner: { start: '#2e7d32', end: '#2e7d32' },
  intermediate: { start: '#b34700', end: '#b85000' },
  advanced: { start: '#c62828', end: '#b71c1c' },
  expert: { start: '#7b1fa2', end: '#6a1b9a' },
};

export const DEFAULT_DIFFICULTY_COLORS: DifficultyColors = { start: '#616161', end: '#616161' };

export const getDifficultyColors = (difficulty: string): DifficultyColors =>
  Object.prototype.hasOwnProperty.call(DIFFICULTY_COLORS, difficulty)
    ? DIFFICULTY_COLORS[difficulty]
    : DEFAULT_DIFFICULTY_COLORS;

export const getDifficultyBackground = (difficulty: string): string => {
  const { start, end } = getDifficultyColors(difficulty);
  return start === end ? start : `linear-gradient(45deg, ${start}, ${end})`;
};
