import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import { MultipleChoiceQuiz } from '../quiz/MultipleChoiceQuiz';
import { OpenQuestionQuiz } from '../quiz/OpenQuestionQuiz';
import { LearningCard } from '../quiz/LearningCard';
import { QuizRenderer } from '../QuizRenderer';
import type { Word } from '../../services/wordService';
import type { SessionProgress } from '../../store/sessionSlice';
import { theme } from '../../styles/theme';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const context = { sentence: 'Der Hund spielt.', translation: 'De hond speelt.' };

describe('learning content carries its own language', () => {
  it('multiple choice marks prompt, options and example', () => {
    wrap(
      <MultipleChoiceQuiz
        word="hond"
        options={['der Hund', 'die Katze']}
        onSelect={jest.fn()}
        context={context}
        promptLanguage="nl"
        answerLanguage="de"
        contextLanguage="de"
        contextTranslationLanguage="nl"
      />
    );
    expect(screen.getByText('hond')).toHaveAttribute('lang', 'nl');
    expect(screen.getByRole('button', { name: 'der Hund' })).toHaveAttribute('lang', 'de');
    expect(screen.getByText('Der Hund spielt.')).toHaveAttribute('lang', 'de');
    expect(screen.getByText('De hond speelt.')).toHaveAttribute('lang', 'nl');
  });

  it('open answer marks the prompt, example and the answer input', () => {
    wrap(
      <OpenQuestionQuiz
        word="de hond"
        userAnswer=""
        onAnswerChange={jest.fn()}
        onSubmit={jest.fn()}
        context={context}
        promptLanguage="nl"
        answerLanguage="de"
        contextLanguage="de"
        contextTranslationLanguage="nl"
      />
    );
    expect(screen.getByText('de hond')).toHaveAttribute('lang', 'nl');
    expect(screen.getByRole('textbox')).toHaveAttribute('lang', 'de');
    expect(screen.getByText('Der Hund spielt.')).toHaveAttribute('lang', 'de');
  });

  it('adds no lang attribute when the language is unknown', () => {
    wrap(<MultipleChoiceQuiz word="de hond" options={['x']} onSelect={jest.fn()} />);
    expect(screen.getByText('de hond')).not.toHaveAttribute('lang');
  });

  it.each([
    ['definition-to-term', 'de hond', 'nl', 'der Hund', 'de'],
    ['term-to-definition', 'der Hund', 'de', 'de hond', 'nl'],
  ] as const)(
    'learning card (%s) marks both words and hides the emoji',
    (direction, q, ql, a, al) => {
      const word: Word = { id: '1', term: 'der Hund', definition: 'de hond', direction, context };
      const { container } = wrap(
        <LearningCard
          word={word}
          currentIndex={0}
          totalWords={1}
          onContinue={jest.fn()}
          autoAdvance={false}
          languageCode="de"
        />
      );
      expect(screen.getByText(q)).toHaveAttribute('lang', ql);
      expect(screen.getByText(a)).toHaveAttribute('lang', al);
      expect(screen.getByText(/Der Hund spielt\./)).toHaveAttribute('lang', 'de');
      expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('🌱');
    }
  );
});

describe('QuizRenderer derives languages from the course and the word', () => {
  const progress: SessionProgress = {
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
  const renderQuiz = (languageCode: string, currentWord: Word) =>
    wrap(
      <QuizRenderer
        currentWord={currentWord}
        quizMode="multiple-choice"
        currentOptions={[currentWord.term, currentWord.definition]}
        wordProgress={{}}
        isUsingSpacedRepetition={false}
        getCurrentWordInfo={() => null}
        showLearningCard={false}
        wordLearningStatus={{ isTrulyNewWord: false, needsReinforcement: false }}
        currentSession={null}
        sessionProgress={progress}
        getSessionStats={() => null}
        isTransitioning={false}
        inputValue=""
        setInputValue={jest.fn()}
        lastAnswerCorrect={null}
        lastSelectedAnswer=""
        feedbackQuestionKey=""
        languageCode={languageCode}
        contextForWord={undefined}
        handleSubmit={jest.fn()}
        handleOpenQuestionSubmit={jest.fn()}
        handleContinueFromLearningCard={jest.fn()}
      />
    );

  it.each([
    ['de', 'der Hund', 'de hond', 'de', 'nl'],
    ['es', 'el perro', 'de hond', 'es', 'nl'],
  ])(
    '%s, definition-to-term: prompt is Dutch, options carry the course language',
    (code, term, def, tl, dl) => {
      renderQuiz(code, { id: '1', term, definition: def, direction: 'definition-to-term' });
      expect(screen.getAllByText(def)[0]).toHaveAttribute('lang', dl);
      expect(screen.getByRole('button', { name: term })).toHaveAttribute('lang', tl);
    }
  );

  it('a Dutch-term word (term-to-definition) is marked Dutch, not German', () => {
    renderQuiz('de', {
      id: '2',
      term: 'het huis',
      definition: 'das Haus',
      direction: 'term-to-definition',
      termLanguage: 'nl',
      definitionLanguage: 'de',
    });
    expect(screen.getAllByText('het huis')[0]).toHaveAttribute('lang', 'nl');
    expect(screen.getByRole('button', { name: 'das Haus' })).toHaveAttribute('lang', 'de');
  });
});
