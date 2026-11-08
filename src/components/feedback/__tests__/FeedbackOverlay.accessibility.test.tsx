import { ThemeProvider } from '@emotion/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FeedbackOverlay } from '../FeedbackOverlay';
import { theme } from '../../../styles/theme';

const renderFeedback = (props: React.ComponentProps<typeof FeedbackOverlay>) =>
  render(
    <ThemeProvider theme={theme}>
      <FeedbackOverlay {...props} />
    </ThemeProvider>
  );

describe('FeedbackOverlay accessibility', () => {
  it('announces each answer and keeps correction feedback reviewable after the overlay clears', () => {
    const props = {
      isCorrect: false,
      answerSequence: 1,
      selectedAnswer: 'Katze',
      correctAnswer: 'Hund',
      originalWord: 'dog',
    } satisfies React.ComponentProps<typeof FeedbackOverlay>;

    const { rerender } = renderFeedback(props);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Answer 1: Incorrect. Correct answer: Hund.'
    );

    fireEvent.click(screen.getByText('Review previous answer'));
    expect(screen.getByText('Your answer: Katze')).toBeInTheDocument();
    expect(screen.getAllByText('Hund')).toHaveLength(2);

    rerender(
      <ThemeProvider theme={theme}>
        <FeedbackOverlay {...props} answerSequence={2} />
      </ThemeProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Answer 2: Incorrect. Correct answer: Hund.'
    );

    rerender(
      <ThemeProvider theme={theme}>
        <FeedbackOverlay {...props} isCorrect={null} answerSequence={2} />
      </ThemeProvider>
    );

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByText('Review previous answer')).toBeInTheDocument();
    expect(screen.getByText('Your answer: Katze')).toBeInTheDocument();
  });

  it('announces correct answers with text rather than relying on color or sound', () => {
    renderFeedback({
      isCorrect: true,
      answerSequence: 1,
      selectedAnswer: 'Hund',
      correctAnswer: 'Hund',
    });

    expect(screen.getByRole('status')).toHaveTextContent('Answer 1: Correct.');
    expect(screen.getByText('★')).toBeInTheDocument();
    expect(screen.queryByText('🎉')).not.toBeInTheDocument();
  });
});
