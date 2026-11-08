import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import { FillInTheBlankQuiz } from '../quiz/FillInTheBlankQuiz';
import { GameModeHandler } from '../../services/game/GameModeHandler';
import type { Word } from '../../services/wordService';
import { theme } from '../../styles/theme';

const renderQuizForWord = (word: Word) => {
  const context = new GameModeHandler().getContextForDirection(word);
  return render(
    <ThemeProvider theme={theme}>
      <FillInTheBlankQuiz
        word={word.term}
        userAnswer=""
        onAnswerChange={jest.fn()}
        onSubmit={jest.fn()}
        context={context}
      />
    </ThemeProvider>
  );
};

describe('fill-in-the-blank rendering', () => {
  it.each([
    ['de', 'Hund', '{BLANK} spielt.', '_____spielt.'],
    ['de', 'Hund', 'Der {BLANK} spielt.', 'Der_____spielt.'],
    ['de', 'Hund', 'Der Hund ist ein {BLANK}', 'Der Hund ist ein_____'],
    ['es', 'perro', '{BLANK} corre.', '_____corre.'],
    ['es', 'perro', 'El {BLANK} corre.', 'El_____corre.'],
    ['es', 'perro', 'Veo un {BLANK}', 'Veo un_____'],
  ])(
    'renders authored %s template at the start, middle, or end',
    (_language, term, template, expected) => {
      const word: Word = {
        id: `${_language}-${term}`,
        term,
        definition: 'example',
        context: {
          sentence: `${term} example`,
          translation: 'example translation',
          sentenceWithBlank: template,
        },
      };

      renderQuizForWord(word);

      expect(screen.getByTestId('blank-sentence')).toHaveTextContent(expected);
    }
  );

  it('renders boundary blanks when fallback extraction leaves one side empty', () => {
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <FillInTheBlankQuiz
          word="Hund"
          userAnswer=""
          onAnswerChange={jest.fn()}
          onSubmit={jest.fn()}
          context={{ sentence: 'Hund spielt.', translation: 'The dog plays.' }}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('blank-sentence')).toHaveTextContent('_____spielt.');

    rerender(
      <ThemeProvider theme={theme}>
        <FillInTheBlankQuiz
          word="Hund"
          userAnswer=""
          onAnswerChange={jest.fn()}
          onSubmit={jest.fn()}
          context={{ sentence: 'Der Hund', translation: 'The dog' }}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('blank-sentence')).toHaveTextContent('Der_____');
  });

  it('falls back to sentence extraction when an authored template is null', () => {
    renderQuizForWord({
      id: 'de-hund',
      term: 'Hund',
      definition: 'dog',
      context: {
        sentence: 'Der Hund spielt.',
        translation: 'The dog plays.',
        sentenceWithBlank: null,
      },
    });

    expect(screen.getByTestId('blank-sentence')).toHaveTextContent('Der_____spielt.');
  });

  it('falls back safely for malformed templates without revealing the answer', () => {
    const { container } = renderQuizForWord({
      id: 'es-perro',
      term: 'perro',
      definition: 'dog',
      context: {
        sentence: 'A sentence without the target.',
        translation: 'A translation.',
        sentenceWithBlank: 'perro {BLANK} perro {BLANK}',
      },
    });

    expect(screen.getByText('Complete the sentence:')).toBeInTheDocument();
    expect(screen.getByText('_____')).toBeInTheDocument();
    expect(container.textContent).not.toContain('perro');
    expect(container.textContent).not.toContain('German');
  });

  it('renders authored sentence content as text, not executable markup', () => {
    const { container } = renderQuizForWord({
      id: 'es-perro',
      term: 'perro',
      definition: 'dog',
      context: {
        sentence: '<img src=x onerror=alert(1)> perro',
        translation: 'dog',
        sentenceWithBlank: '<img src=x onerror=alert(1)> {BLANK}',
      },
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
