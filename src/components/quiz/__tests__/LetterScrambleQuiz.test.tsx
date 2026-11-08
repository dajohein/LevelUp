import { ThemeProvider } from '@emotion/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LetterScrambleQuiz } from '../LetterScrambleQuiz';
import { theme } from '../../../styles/theme';

function renderQuiz(word: string) {
  const onAnswer = jest.fn();
  render(
    <ThemeProvider theme={theme}>
      <LetterScrambleQuiz
        word={word}
        definition="test definition"
        currentWord={1}
        totalWords={1}
        onAnswer={onAnswer}
      />
    </ThemeProvider>
  );
  return onAnswer;
}

function typeLetters(...letters: string[]) {
  for (const key of letters) {
    fireEvent.keyDown(document, { key });
  }
}

describe('LetterScrambleQuiz keyboard input', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts German umlauts and sharp s and checks the complete answer', () => {
    jest.useFakeTimers();
    const onAnswer = renderQuiz('Füße');

    typeLetters('F', 'Ü', 'ß', 'E');

    expect(screen.getByRole('button', { name: 'Remove letter ß' })).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(300));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('matches Spanish combining marks without treating the unaccented letter as equivalent', () => {
    jest.useFakeTimers();
    const onAnswer = renderQuiz('pin\u0303a');

    expect(fireEvent.keyDown(document, { key: 'n' })).toBe(true);
    typeLetters('p', 'i', 'ñ', 'a');

    expect(screen.getByRole('button', { name: 'Remove letter ñ' })).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(300));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('uses duplicate letters one at a time and preserves modified and composing input', () => {
    const onAnswer = renderQuiz('llama');

    expect(fireEvent.keyDown(document, { key: 'a', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(document, { key: 'a', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(document, { key: 'a', altKey: true })).toBe(true);
    expect(fireEvent.keyDown(document, { key: 'l', isComposing: true })).toBe(true);
    typeLetters('L', 'L');

    expect(screen.getAllByRole('button', { name: 'Remove letter l' })).toHaveLength(2);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('does not capture text typed in editable controls', () => {
    renderQuiz('abc');
    const input = document.createElement('input');
    document.body.appendChild(input);

    expect(fireEvent.keyDown(input, { key: 'a' })).toBe(true);
    expect(screen.queryByRole('button', { name: 'Remove letter a' })).not.toBeInTheDocument();

    input.remove();
  });

  it('locks input while the completed answer is being checked', () => {
    jest.useFakeTimers();
    const onAnswer = renderQuiz('ab');
    typeLetters('a', 'b');

    expect(fireEvent.keyDown(document, { key: 'Backspace' })).toBe(true);
    act(() => jest.advanceTimersByTime(300));

    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});
