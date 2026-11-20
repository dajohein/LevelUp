import {
  DEFAULT_DIFFICULTY_COLORS,
  DIFFICULTY_COLORS,
  DIFFICULTY_TEXT_COLOR,
  getDifficultyBackground,
  getDifficultyColors,
} from '../difficultyColors';

const channel = (hex: string, i: number) => {
  const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('difficulty colours', () => {
  const all = [
    ...Object.entries(DIFFICULTY_COLORS),
    ['default', DEFAULT_DIFFICULTY_COLORS] as const,
  ];

  it.each(all)('%s: both gradient ends reach 4.5:1 with the button text', (_name, colors) => {
    expect(contrast(DIFFICULTY_TEXT_COLOR, colors.start)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(DIFFICULTY_TEXT_COLOR, colors.end)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the contrast helper honest (white on the old green failed)', () => {
    expect(contrast('#ffffff', '#4caf50')).toBeLessThan(3);
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'inherited object property name %s falls back to the default',
    name => {
      expect(getDifficultyColors(name)).toBe(DEFAULT_DIFFICULTY_COLORS);
      expect(getDifficultyBackground(name)).toBe('#616161');
    }
  );

  it('falls back for unknown difficulties and builds backgrounds', () => {
    expect(getDifficultyColors('nope')).toBe(DEFAULT_DIFFICULTY_COLORS);
    expect(getDifficultyBackground('beginner')).toBe('#2e7d32');
    expect(getDifficultyBackground('advanced')).toContain('linear-gradient(45deg,');
  });
});
