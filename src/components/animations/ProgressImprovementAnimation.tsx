import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

interface ProgressDelta {
  wordId: string;
  term: string;
  definition: string;
  previousXP: number;
  newXP: number;
  xpGain: number;
}

interface ProgressImprovementAnimationProps {
  improvements: ProgressDelta[];
  onComplete: () => void;
}

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const countUp = keyframes`
  from {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  to {
    transform: scale(1);
  }
`;

const progressFill = keyframes`
  from {
    width: 0%;
  }
  to {
    width: var(--target-width);
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${slideInUp} 0.5s ease-out;
`;

const Modal = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.xl};
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.success};
  margin-bottom: ${props => props.theme.spacing.md};
  font-size: 2rem;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.1rem;
`;

const ImprovementsList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const ImprovementCard = styled.div<{ index: number }>`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
  animation: ${slideInUp} 0.5s ease-out;
  animation-delay: ${props => props.index * 0.1}s;
  animation-fill-mode: both;
`;

const WordInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const WordTerm = styled.div`
  font-weight: bold;
  color: ${props => props.theme.colors.text};
`;

const XPGain = styled.div`
  color: ${props => props.theme.colors.success};
  font-weight: bold;
  animation: ${countUp} 0.6s ease-out;
`;

const ProgressBarContainer = styled.div`
  position: relative;
  height: 8px;
  background: ${props => props.theme.colors.surface};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const ProgressBarPrevious = styled.div<{ width: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.theme.colors.textSecondary};
  transition: width 0.3s ease;
`;

const ProgressBarNew = styled.div<{ width: number; delay: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: ${props => props.theme.colors.success};
  animation: ${progressFill} 1s ease-out;
  animation-delay: ${props => props.delay}s;
  animation-fill-mode: both;
  --target-width: ${props => props.width}%;
`;

const ProgressLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const CloseButton = styled.button`
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.background};
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
`;

const Summary = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.xl};
  text-align: center;
`;

const SummaryNumber = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.success};
  animation: ${countUp} 0.8s ease-out;
`;

const SummaryLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  margin-top: ${props => props.theme.spacing.xs};
`;

export const ProgressImprovementAnimation: React.FC<ProgressImprovementAnimationProps> = ({
  improvements,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Auto-advance through the animation steps
    const timer = setTimeout(() => {
      if (currentStep < improvements.length + 1) {
        setCurrentStep(prev => prev + 1);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [currentStep, improvements.length]);

  const totalXPGain = improvements.reduce((sum, imp) => sum + imp.xpGain, 0);

  return (
    <Overlay onClick={onComplete}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <Title>🎉 Great Progress!</Title>
          <Subtitle>Your learning journey continues to shine</Subtitle>
        </Header>

        <Summary>
          <SummaryNumber>+{totalXPGain}</SummaryNumber>
          <SummaryLabel>Total XP Gained</SummaryLabel>
        </Summary>

        <ImprovementsList>
          {improvements.slice(0, currentStep).map((improvement, index) => (
            <ImprovementCard key={improvement.wordId} index={index}>
              <WordInfo>
                <WordTerm>{improvement.term}</WordTerm>
                <XPGain>+{improvement.xpGain} XP</XPGain>
              </WordInfo>
              
              <ProgressBarContainer>
                <ProgressBarPrevious width={improvement.previousXP} />
                <ProgressBarNew 
                  width={improvement.newXP} 
                  delay={index * 0.1}
                />
              </ProgressBarContainer>
              
              <ProgressLabels>
                <span>{improvement.previousXP} XP</span>
                <span>{improvement.newXP} XP</span>
              </ProgressLabels>
            </ImprovementCard>
          ))}
        </ImprovementsList>

        <CloseButton onClick={onComplete}>
          Continue Learning 🚀
        </CloseButton>
      </Modal>
    </Overlay>
  );
};