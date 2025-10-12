/**
 * AI Learning Demo Component
 * 
 * Demonstrates the AI-enhanced learning engine capabilities:
 * - Shows how AI detects when users are struggling vs excelling
 * - Demonstrates automatic quiz mode switching
 * - Shows intervention messages and reasoning
 * - Allows toggling AI features on/off
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useAILearning } from '../hooks/useAILearning';

const DemoContainer = styled.div`
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
`;

const StatusSection = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatusCard = styled.div`
  background: rgba(255, 255, 255, 0.2);
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
`;

const StatusLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 0.5rem;
`;

const StatusValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
`;

const QuizSimulator = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const WordDisplay = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const CurrentWord = styled.h2`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const QuizMode = styled.div<{ isAIControlled?: boolean }>`
  font-size: 1.1rem;
  opacity: 0.8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  ${({ isAIControlled }) => isAIControlled && `
    &::before {
      content: '🤖';
    }
    color: #4ecdc4;
    font-weight: bold;
  `}
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const Button = styled.button<{ variant?: 'correct' | 'incorrect' | 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${({ variant }) => {
    switch (variant) {
      case 'correct':
        return `
          background: #4ecdc4;
          color: white;
          &:hover { background: #44a08d; }
        `;
      case 'incorrect':
        return `
          background: #ff6b6b;
          color: white;
          &:hover { background: #ee5a52; }
        `;
      case 'primary':
        return `
          background: linear-gradient(45deg, #4a90e2, #357abd);
          color: white;
          &:hover { transform: translateY(-2px); }
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.2);
          color: white;
          &:hover { background: rgba(255, 255, 255, 0.3); }
        `;
    }
  }}
`;

const AIControlToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1.1rem;
`;

const Toggle = styled.input`
  width: 50px;
  height: 25px;
  appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;

  &:checked {
    background: #4ecdc4;
  }

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 21px;
    height: 21px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    transform: ${({ checked }: { checked?: boolean }) => checked ? 'translateX(25px)' : 'translateX(0)'};
  }
`;

const InterventionAlert = styled.div<{ show: boolean; type?: string }>`
  background: ${({ type }) => {
    switch (type) {
      case 'support': return 'linear-gradient(45deg, #ff9a56, #ffce54)';
      case 'challenge': return 'linear-gradient(45deg, #4ecdc4, #44a08d)';
      case 'break': return 'linear-gradient(45deg, #fc6e51, #ed5565)';
      default: return 'linear-gradient(45deg, #5d9cec, #4a90e2)';
    }
  }};
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1rem;
  opacity: ${({ show }) => show ? 1 : 0};
  transform: translateY(${({ show }) => show ? '0' : '-10px'});
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 600;
`;

const ReasoningList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 1rem;
`;

const ReasoningItem = styled.li`
  padding: 0.5rem 0;
  font-size: 0.9rem;
  opacity: 0.9;
  
  &::before {
    content: '💡 ';
    margin-right: 0.5rem;
  }
`;

export const AILearningDemo: React.FC = () => {
  const [aiLearningState, aiLearningActions] = useAILearning({
    userId: 'demo_user',
    enableAI: true
  });

  const [simulationData, setSimulationData] = useState({
    correctAnswers: 0,
    totalAnswers: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    averageResponseTime: 5000,
    currentWord: 'der Hund',
    currentTranslation: 'the dog'
  });

  const [isAIEnabled, setIsAIEnabled] = useState(true);

  // Initialize demo session
  useEffect(() => {
    if (isAIEnabled) {
      aiLearningActions.initializeSession('de');
    }
  }, [isAIEnabled]);

  const simulateAnswer = async (isCorrect: boolean) => {
    const responseTime = Math.random() * 10000 + 2000; // 2-12 seconds
    
    setSimulationData(prev => ({
      ...prev,
      totalAnswers: prev.totalAnswers + 1,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      consecutiveCorrect: isCorrect ? prev.consecutiveCorrect + 1 : 0,
      consecutiveIncorrect: isCorrect ? 0 : prev.consecutiveIncorrect + 1,
      averageResponseTime: (prev.averageResponseTime + responseTime) / 2
    }));

    if (isAIEnabled) {
      const result = await aiLearningActions.recordAnswer(isCorrect, responseTime);
      
      if (result.shouldShowIntervention) {
        console.log('🚨 AI Intervention:', result.interventionMessage);
      }
    }
  };

  const accuracy = simulationData.totalAnswers > 0 
    ? simulationData.correctAnswers / simulationData.totalAnswers 
    : 0;

  const getCognitiveLoadLevel = () => {
    if (simulationData.consecutiveIncorrect >= 3) return 'High';
    if (simulationData.averageResponseTime > 8000) return 'High';
    if (accuracy < 0.5) return 'Overloaded';
    if (accuracy > 0.8 && simulationData.averageResponseTime < 4000) return 'Low';
    return 'Optimal';
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    if (simulationData.consecutiveIncorrect >= 3) {
      recommendations.push('Switch to multiple choice for confidence building');
      recommendations.push('Review easier content');
    }
    
    if (accuracy > 0.85 && simulationData.consecutiveCorrect >= 5) {
      recommendations.push('Increase difficulty level');
      recommendations.push('Introduce more challenging quiz modes');
    }
    
    if (simulationData.averageResponseTime > 10000) {
      recommendations.push('Consider taking a break');
      recommendations.push('Reduce cognitive load');
    }

    return recommendations;
  };

  return (
    <DemoContainer>
      <Title>🤖 AI Learning Engine Demo</Title>
      
      <AIControlToggle>
        <ToggleLabel>
          <span>AI Learning Control:</span>
          <Toggle 
            type="checkbox" 
            checked={isAIEnabled} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsAIEnabled(e.target.checked);
              aiLearningActions.toggleAI(e.target.checked);
            }}
          />
          <span>{isAIEnabled ? 'Enabled' : 'Disabled'}</span>
        </ToggleLabel>
      </AIControlToggle>

      <StatusSection>
        <h3>📊 Learning Analytics</h3>
        <StatusGrid>
          <StatusCard>
            <StatusLabel>Accuracy</StatusLabel>
            <StatusValue>{(accuracy * 100).toFixed(1)}%</StatusValue>
          </StatusCard>
          <StatusCard>
            <StatusLabel>Quiz Mode</StatusLabel>
            <StatusValue>{aiLearningState.quizMode}</StatusValue>
          </StatusCard>
          <StatusCard>
            <StatusLabel>Cognitive Load</StatusLabel>
            <StatusValue>{getCognitiveLoadLevel()}</StatusValue>
          </StatusCard>
          <StatusCard>
            <StatusLabel>AI Decisions</StatusLabel>
            <StatusValue>{aiLearningState.sessionStats.aiDecisions}</StatusValue>
          </StatusCard>
        </StatusGrid>
      </StatusSection>

      <QuizSimulator>
        <h3>🎯 Quiz Simulator</h3>
        <WordDisplay>
          <CurrentWord>{simulationData.currentWord}</CurrentWord>
          <QuizMode isAIControlled={!!aiLearningState.aiDecision}>
            Mode: {aiLearningState.quizMode}
          </QuizMode>
        </WordDisplay>

        <InterventionAlert 
          show={aiLearningState.shouldShowIntervention}
          type={aiLearningState.aiDecision?.intervention?.type}
        >
          🤖 {aiLearningState.interventionMessage}
          {aiLearningState.aiDecision && (
            <ReasoningList>
              {aiLearningState.aiDecision.reasoning.map((reason, index) => (
                <ReasoningItem key={index}>{reason}</ReasoningItem>
              ))}
            </ReasoningList>
          )}
        </InterventionAlert>

        <ButtonGroup>
          <Button variant="correct" onClick={() => simulateAnswer(true)}>
            ✅ Correct Answer
          </Button>
          <Button variant="incorrect" onClick={() => simulateAnswer(false)}>
            ❌ Wrong Answer
          </Button>
        </ButtonGroup>

        {aiLearningState.shouldShowIntervention && (
          <ButtonGroup>
            <Button variant="primary" onClick={aiLearningActions.skipIntervention}>
              👍 Accept AI Suggestion
            </Button>
            <Button variant="secondary" onClick={aiLearningActions.skipIntervention}>
              🚫 Dismiss
            </Button>
          </ButtonGroup>
        )}
      </QuizSimulator>

      <StatusSection>
        <h3>🎯 AI Recommendations</h3>
        {getRecommendations().length > 0 ? (
          <ReasoningList>
            {getRecommendations().map((rec, index) => (
              <ReasoningItem key={index}>{rec}</ReasoningItem>
            ))}
          </ReasoningList>
        ) : (
          <p style={{ textAlign: 'center', opacity: 0.7 }}>
            Keep learning! AI is monitoring your progress.
          </p>
        )}
      </StatusSection>

      <StatusSection>
        <h3>📈 Session Statistics</h3>
        <StatusGrid>
          <StatusCard>
            <StatusLabel>Words Completed</StatusLabel>
            <StatusValue>{aiLearningState.sessionStats.currentIndex}</StatusValue>
          </StatusCard>
          <StatusCard>
            <StatusLabel>Session Progress</StatusLabel>
            <StatusValue>
              {aiLearningState.sessionStats.totalWords > 0 
                ? Math.round((aiLearningState.sessionStats.currentIndex / aiLearningState.sessionStats.totalWords) * 100)
                : 0}%
            </StatusValue>
          </StatusCard>
          <StatusCard>
            <StatusLabel>Consecutive Correct</StatusLabel>
            <StatusValue>{simulationData.consecutiveCorrect}</StatusValue>
          </StatusCard>
          <StatusCard>
            <StatusLabel>Consecutive Errors</StatusLabel>
            <StatusValue>{simulationData.consecutiveIncorrect}</StatusValue>
          </StatusCard>
        </StatusGrid>
      </StatusSection>
    </DemoContainer>
  );
};

export default AILearningDemo;