import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FillInTheBlankQuiz } from '../FillInTheBlankQuiz';
import { OpenQuestionQuiz } from '../OpenQuestionQuiz';
import { theme } from '../../../styles/theme';

describe.each([
  ['open-answer', OpenQuestionQuiz],
  ['fill-in-the-blank', FillInTheBlankQuiz],
])('%s submit action', (_mode, Quiz) => {
  it('exposes an explicit action that submits the answer', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <Quiz
          word="translation"
          userAnswer="answer"
          onAnswerChange={jest.fn()}
          onSubmit={onSubmit}
        />
      </ThemeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Submit answer' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
