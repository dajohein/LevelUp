import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AnimatedInput } from '../animations/AnimatedInput';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
  animation: ${fadeIn} 0.3s ease-out;
  width: 100%;
  max-width: 600px;
`;

const ModeIndicator = styled.div`
  background-color: ${props => props.theme.colors.secondary || props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const ContextSection = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  margin: ${props => props.theme.spacing.sm} 0;
  border-left: 4px solid ${props => props.theme.colors.secondary || props.theme.colors.primary};
  max-width: 600px;
  width: 100%;
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    margin: ${props => props.theme.spacing.xs} 0;
  }
`;

const ContextLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const SentenceContainer = styled.div`
  font-size: 1.3rem;
  line-height: 1.6;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.1rem;
    line-height: 1.5;
  }
`;

const BlankSpace = styled.span<{ isCorrect?: boolean; isError?: boolean }>`
  display: inline-block;
  min-width: 120px;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  margin: 0 ${props => props.theme.spacing.xs};
  border-bottom: 3px solid
    ${props =>
      props.isCorrect
        ? props.theme.colors.success
        : props.isError
          ? props.theme.colors.error
          : props.theme.colors.primary};
  background-color: ${props =>
    props.isCorrect
      ? `${props.theme.colors.success}15`
      : props.isError
        ? `${props.theme.colors.error}15`
        : 'transparent'};
  border-radius: ${props => props.theme.borderRadius.sm};
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 600;
  color: ${props =>
    props.isCorrect
      ? props.theme.colors.success
      : props.isError
        ? props.theme.colors.error
        : props.theme.colors.text};
`;

const QuestionPrompt = styled.div`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.lg};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// Removed unused styled component: InstructionText

const BrainProgressContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.md};
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};

  @media (max-width: 768px) {
    font-size: 0.8rem;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const BrainIcon = styled.div<{ filled: boolean; partial?: boolean }>`
  width: 24px;
  height: 24px;
  position: relative;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
  }

  &::before {
    content: '🧠';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    filter: ${props =>
      props.filled
        ? 'none'
        : props.partial
          ? 'brightness(0.7) saturate(0.8)'
          : 'grayscale(1) brightness(0.4)'};
    transform: ${props => (props.filled || props.partial ? 'scale(1.1)' : 'scale(1)')};
  }
`;

const BrainContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BrainProgress: React.FC<{ xp: number; level: number }> = ({ xp, level }) => {
  // Calculate progress within current level (0-100%)
  const progressInLevel = xp % 100;

  // Calculate how many brains should be filled
  const brain1Filled = progressInLevel >= 33;
  const brain2Filled = progressInLevel >= 66;
  const brain3Filled = progressInLevel >= 99;

  const brain1Partial = progressInLevel >= 10 && progressInLevel < 33;
  const brain2Partial = progressInLevel >= 40 && progressInLevel < 66;
  const brain3Partial = progressInLevel >= 80 && progressInLevel < 99;

  return (
    <BrainProgressContainer>
      <span>Level {level}</span>
      <BrainContainer>
        <BrainIcon filled={brain1Filled} partial={brain1Partial} />
        <BrainIcon filled={brain2Filled} partial={brain2Partial} />
        <BrainIcon filled={brain3Filled} partial={brain3Partial} />
      </BrainContainer>
      <span>{xp} XP</span>
    </BrainProgressContainer>
  );
};

interface FillInTheBlankQuizProps {
  word: string;
  questionWord?: string; // The Dutch word to translate
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  isCorrect?: boolean;
  isError?: boolean;
  hint?: string;
  disabled?: boolean;
  level?: number;
  xp?: number;
  context?: { sentence: string; translation: string; sentenceWithBlank?: string; audio?: string };
  currentWord?: number;
  totalWords?: number;
}

const FillInTheBlankQuizComponent: React.FC<FillInTheBlankQuizProps> = ({
  word,
  questionWord,
  userAnswer,
  onAnswerChange,
  onSubmit,
  isCorrect,
  isError,
  hint,
  disabled = false,
  level = 1,
  xp = 0,
  context,
  currentWord = 1,
  totalWords = 1,
}) => {
  // Create a sentence with a blank if context is available
  const getSentenceWithBlank = () => {
    if (!context?.sentence) {
      // If no context, just show the word as a simple translation request
      return {
        beforeBlank: '',
        afterBlank: '',
      };
    }

    // Use explicit blank markers if available (preferred method)
    if (context.sentenceWithBlank) {
      const parts = context.sentenceWithBlank.split('{BLANK}');
      if (parts.length === 2) {
        return {
          beforeBlank: parts[0].trim(),
          afterBlank: parts[1].trim(),
        };
      }
    }

    // Fallback: try to find and blank the word in the original sentence
    const sentence = context.sentence;
    const sentenceLower = sentence.toLowerCase();
    const wordToReplace = word.toLowerCase().trim();
    let wordIndex = sentenceLower.indexOf(wordToReplace);
    let actualWordLength = word.length;

    // If not found, try without articles
    if (wordIndex === -1 && /^(der|die|das|ein|eine)\s+/.test(word)) {
      const wordWithoutArticle = word.replace(/^(der|die|das|ein|eine)\s+/i, '').trim();
      const withoutArticleIndex = sentenceLower.indexOf(wordWithoutArticle.toLowerCase());
      if (withoutArticleIndex !== -1) {
        wordIndex = withoutArticleIndex;
        actualWordLength = wordWithoutArticle.length;
      }
    }

    if (wordIndex !== -1) {
      // Found the word in the sentence, create the blank
      const before = String(sentence.substring(0, wordIndex)).trim();
      const after = String(sentence.substring(wordIndex + actualWordLength)).trim();

      return {
        beforeBlank: before,
        afterBlank: after,
      };
    }

    // Final fallback: show instruction without revealing answer
    return {
      beforeBlank: 'Complete the German sentence:',
      afterBlank: '',
    };
  };

  const { beforeBlank, afterBlank } = getSentenceWithBlank();
  // Only show answer after user has submitted and it's been validated
  const showAnswer = isCorrect === true && disabled;

  return (
    <Container>
      <ModeIndicator>Fill in the Blank</ModeIndicator>

      {questionWord && <QuestionPrompt>{questionWord}</QuestionPrompt>}

      {context?.sentence && beforeBlank && afterBlank && (
        <ContextSection>
          <ContextLabel>Complete the sentence</ContextLabel>
          <SentenceContainer>
            <span dangerouslySetInnerHTML={{ __html: beforeBlank }} />
            <BlankSpace isCorrect={isCorrect} isError={isError}>
              {showAnswer ? word : '_____'}
            </BlankSpace>
            <span dangerouslySetInnerHTML={{ __html: afterBlank }} />
          </SentenceContainer>
        </ContextSection>
      )}

      <AnimatedInput
        value={userAnswer}
        onChange={onAnswerChange}
        onSubmit={onSubmit}
        isCorrect={isCorrect}
        isError={isError}
        hint={hint}
        disabled={disabled}
        placeholder="Type your answer..."
      />

      <BrainProgress xp={xp} level={level} />
      {totalWords > 1 && (
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
          {currentWord} / {totalWords}
        </div>
      )}
    </Container>
  );
};

export const FillInTheBlankQuiz = FillInTheBlankQuizComponent;
