import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import { QuizRenderer } from '../QuizRenderer';
import { gameServices } from '../../services/game';
import type { Word } from '../../services/wordService';
import type { SessionProgress } from '../../store/sessionSlice';
import { theme } from '../../styles/theme';

const sessionProgress: SessionProgress = {
  wordsCompleted: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  currentStreak: 0,
  longestStreak: 0,
  timeElapsed: 0,
  hintsUsed: 0,
  score: 0,
  bonusPoints: 0,
};

describe('QuizRenderer answer error accessibility', () => {
  it.each(['open-answer', 'fill-in-the-blank'])(
    'marks an incorrect %s submission as invalid',
    quizMode => {
      const currentWord: Word = {
        id: 'de-hund',
        term: 'Hund',
        definition: 'dog',
        context: {
          sentence: 'Der Hund spielt.',
          translation: 'The dog plays.',
        },
      };
      const questionKey = `${currentWord.id}-${gameServices.modeHandler.getQuestionWord(
        currentWord
      )}`;

      render(
        <ThemeProvider theme={theme}>
          <QuizRenderer
            currentWord={currentWord}
            quizMode={quizMode}
            currentOptions={[]}
            wordProgress={{}}
            isUsingSpacedRepetition={false}
            getCurrentWordInfo={() => null}
            showLearningCard={false}
            wordLearningStatus={{ isTrulyNewWord: false, needsReinforcement: false }}
            currentSession={null}
            sessionProgress={sessionProgress}
            getSessionStats={() => null}
            isTransitioning
            inputValue="Katze"
            setInputValue={jest.fn()}
            lastAnswerCorrect={false}
            lastSelectedAnswer="Katze"
            feedbackQuestionKey={questionKey}
            contextForWord={currentWord.context}
            handleSubmit={jest.fn()}
            handleOpenQuestionSubmit={jest.fn()}
            handleContinueFromLearningCard={jest.fn()}
          />
        </ThemeProvider>
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    }
  );
});
