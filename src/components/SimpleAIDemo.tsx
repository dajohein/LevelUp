/**
 * Simple AI Learning Demo
 * 
 * A basic demo component to test the re-enabled AI features
 * This demonstrates the simple AI learning service in action
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useAIEnhancedGame } from '../hooks/useAIEnhancedGame';
import { BaseButton, Card } from './ui';
import { theme } from '../styles/theme';

const DemoContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: ${theme.colors.background};
`;

const AIStatusCard = styled(Card)`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(46, 125, 50, 0.1));
  border: 1px solid rgba(76, 175, 80, 0.3);
`;

const WordCard = styled(Card)`
  text-align: center;
  padding: 2rem;
  margin: 1rem 0;
`;

const AIInsightsCard = styled(Card)`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
`;

const ReasoningList = styled.ul`
  text-align: left;
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  
  li {
    margin: 0.25rem 0;
    color: ${theme.colors.textSecondary};
  }
`;

interface SimpleAIDemoProps {
  languageCode: string;
}

export const SimpleAIDemo: React.FC<SimpleAIDemoProps> = ({ languageCode }) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  
  const {
    enhancedState,
    aiEnhancedState,
    initializeEnhancedSession,
    trackWordAttempt,
    getAIInsights,
    toggleAI
  } = useAIEnhancedGame(languageCode, undefined, aiEnabled);

  const aiInsights = getAIInsights();

  const handleStartSession = async () => {
    await initializeEnhancedSession();
    setSessionStarted(true);
  };

  const handleAnswer = (correct: boolean) => {
    if (enhancedState.currentWordInfo?.word) {
      const isComplete = trackWordAttempt(enhancedState.currentWordInfo.word.id, correct);
      if (isComplete) {
        setSessionStarted(false);
      }
    }
  };

  const handleToggleAI = () => {
    setAiEnabled(!aiEnabled);
    toggleAI();
  };

  return (
    <DemoContainer>
      <h1>🤖 Simple AI Learning Demo</h1>
      <p>This demonstrates the re-enabled AI features with simple intelligence</p>

      <AIStatusCard>
        <h3>AI Status</h3>
        <p><strong>AI Enhancement:</strong> {aiEnabled ? '✅ Enabled' : '❌ Disabled'}</p>
        <p><strong>Session Active:</strong> {sessionStarted ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Language:</strong> {languageCode}</p>
        <p><strong>Events Tracked:</strong> {aiEnhancedState.sessionEvents.length}</p>
        
        <ButtonGroup>
          <BaseButton variant="outline" onClick={handleToggleAI}>
            {aiEnabled ? 'Disable AI' : 'Enable AI'}
          </BaseButton>
          <BaseButton variant="primary" onClick={handleStartSession}>
            Start Session
          </BaseButton>
        </ButtonGroup>
      </AIStatusCard>

      {sessionStarted && enhancedState.currentWordInfo && (
        <>
          <WordCard>
            <h2>{enhancedState.currentWordInfo.word.term}</h2>
            <p>{enhancedState.currentWordInfo.word.definition}</p>
            <p><strong>Quiz Mode:</strong> {enhancedState.currentWordInfo.quizMode}</p>
            
            <ButtonGroup>
              <BaseButton variant="primary" onClick={() => handleAnswer(true)}>
                ✅ Correct
              </BaseButton>
              <BaseButton variant="outline" onClick={() => handleAnswer(false)}>
                ❌ Incorrect
              </BaseButton>
            </ButtonGroup>
          </WordCard>

          {aiEnabled && aiInsights && aiEnhancedState.currentWordInfo?.aiReasoning && (
            <AIInsightsCard>
              <h4>🤖 AI Decision Reasoning</h4>
              <p><strong>Confidence:</strong> {((aiEnhancedState.currentWordInfo.aiConfidence || 0) * 100).toFixed(0)}%</p>
              <ReasoningList>
                {aiEnhancedState.currentWordInfo.aiReasoning.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ReasoningList>
              
              <h4>📊 Current Performance</h4>
              <p><strong>Accuracy:</strong> {(aiInsights.performance.accuracy * 100).toFixed(1)}%</p>
              <p><strong>Avg Response Time:</strong> {Math.round(aiInsights.performance.averageResponseTime)}ms</p>
              <p><strong>Consecutive Errors:</strong> {aiInsights.performance.consecutiveErrors}</p>
              <p><strong>Consecutive Success:</strong> {aiInsights.performance.consecutiveSuccess}</p>
            </AIInsightsCard>
          )}
        </>
      )}

      {enhancedState.sessionProgress && (
        <Card style={{ marginTop: '1rem', padding: '1rem' }}>
          <h4>Session Progress</h4>
          <p><strong>Words Completed:</strong> {enhancedState.sessionProgress.currentIndex}</p>
          <p><strong>Accuracy:</strong> {(enhancedState.sessionProgress.accuracy * 100).toFixed(1)}%</p>
          <p><strong>Correct Answers:</strong> {enhancedState.sessionProgress.correctAnswers}</p>
        </Card>
      )}
    </DemoContainer>
  );
};

export default SimpleAIDemo;