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
  border-bottom: 3px solid ${props => 
    props.isCorrect ? props.theme.colors.success :
    props.isError ? props.theme.colors.error :
    props.theme.colors.primary
  };
  background-color: ${props => 
    props.isCorrect ? `${props.theme.colors.success}15` :
    props.isError ? `${props.theme.colors.error}15` :
    'transparent'
  };
  border-radius: ${props => props.theme.borderRadius.sm};
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 600;
  color: ${props => 
    props.isCorrect ? props.theme.colors.success :
    props.isError ? props.theme.colors.error :
    props.theme.colors.text
  };
`;

const ContextTranslation = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.95rem;
  font-style: italic;
  margin-top: ${props => props.theme.spacing.sm};
`;

const InstructionText = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-bottom: ${props => props.theme.spacing.md};
  text-align: center;
`;

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-top: ${props => props.theme.spacing.md};
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100px;
  height: 6px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 3px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => props.progress}%;
    height: 100%;
    background-color: ${props => props.theme.colors.primary};
    transition: width 0.3s ease;
  }
`;

const DefinitionHint = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.sm} 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  border: 1px solid ${props => props.theme.colors.border || props.theme.colors.surface};
`;

interface FillInTheBlankQuizProps {
  word: string;
  definition: string;
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  isCorrect?: boolean;
  isError?: boolean;
  hint?: string;
  disabled?: boolean;
  level?: number;
  xp?: number;
  context?: { sentence: string; translation: string; audio?: string };
  currentWord?: number;
  totalWords?: number;
}

const FillInTheBlankQuizComponent: React.FC<FillInTheBlankQuizProps> = ({
  word,
  definition,
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
      // Fallback: create a simple sentence structure
      return {
        beforeBlank: "The word means: ",
        afterBlank: ""
      };
    }

    // Find the word in the sentence and replace it with a blank
    const sentence = context.sentence;
    const wordToReplace = word.toLowerCase();
    const sentenceLower = sentence.toLowerCase();
    
    // Try to find the exact word (accounting for articles and cases)
    let wordIndex = sentenceLower.indexOf(wordToReplace);
    
    // If not found, try without articles for German
    if (wordIndex === -1) {
      const wordWithoutArticle = word.replace(/^(der|die|das|ein|eine)\s+/i, '');
      wordIndex = sentenceLower.indexOf(wordWithoutArticle.toLowerCase());
    }
    
    if (wordIndex !== -1) {
      const beforeBlank = sentence.substring(0, wordIndex);
      const afterBlank = sentence.substring(wordIndex + word.length);
      return { beforeBlank, afterBlank };
    }
    
    // Fallback: put blank at the end
    return {
      beforeBlank: sentence + " _____ means ",
      afterBlank: ""
    };
  };

  const { beforeBlank, afterBlank } = getSentenceWithBlank();
  const showAnswer = isCorrect !== undefined;

  return (
    <Container>
      <ModeIndicator>Fill in the Blank</ModeIndicator>

      <ContextSection>
        <ContextLabel>Complete the sentence</ContextLabel>
        <SentenceContainer>
          {beforeBlank}
          <BlankSpace isCorrect={isCorrect} isError={isError}>
            {showAnswer ? word : "____"}
          </BlankSpace>
          {afterBlank}
        </SentenceContainer>
        
        {context?.translation && (
          <ContextTranslation>{context.translation}</ContextTranslation>
        )}
      </ContextSection>

      <InstructionText>
        Type the correct word to fill in the blank
      </InstructionText>

      <DefinitionHint>
        <strong>Hint:</strong> {definition}
      </DefinitionHint>

      <AnimatedInput
        value={userAnswer}
        onChange={onAnswerChange}
        onSubmit={onSubmit}
        isCorrect={isCorrect}
        isError={isError}
        hint={hint}
        disabled={disabled}
        placeholder="Type the missing word..."
      />

      <ProgressContainer>
        <span>Level {level}</span>
        <ProgressBar progress={xp % 100} />
        <span>{xp} XP</span>
        {totalWords > 1 && (
          <>
            <span>•</span>
            <span>{currentWord} / {totalWords}</span>
          </>
        )}
      </ProgressContainer>
    </Container>
  );
};

export const FillInTheBlankQuiz = React.memo(FillInTheBlankQuizComponent);