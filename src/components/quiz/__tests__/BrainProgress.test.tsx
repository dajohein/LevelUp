import { render, screen } from '@testing-library/react';
import {
  BrainProgress,
  getWordMasteryLabel,
  getWordMasteryPercent,
} from '../BrainProgress';
import { ThemeProvider } from '@emotion/react';
import { theme } from '../../../styles/theme';

describe('BrainProgress', () => {
  it.each([0, 25, 33, 50, 66, 80, 99, 100, 199, 200])(
    'keeps mastery monotonic at %i XP and caps it at full mastery',
    xp => {
      expect(getWordMasteryPercent(xp)).toBe(Math.min(xp, 100));
    }
  );

  it('does not downgrade mastery at XP level boundaries and exposes an accessible metric', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <BrainProgress xp={99} level={0} />
      </ThemeProvider>
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Word mastery: Expert, 99%, level 0, 99 XP'
    );

    rerender(
      <ThemeProvider theme={theme}>
        <BrainProgress xp={100} level={1} />
      </ThemeProvider>
    );
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Word mastery: Expert, 100%, level 1, 100 XP'
    );
    expect(getWordMasteryLabel(200, 2)).toBe('Expert');
  });
});
