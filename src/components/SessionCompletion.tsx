import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { resetSession } from '../store/sessionSlice';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${props => props.theme.spacing.xl};
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
  text-align: center;
`;

const ResultCard = styled.div<{ isSuccess: boolean }>`
  background: ${props => props.theme.colors.surface};
  border-radius: 20px;
  padding: ${props => props.theme.spacing.xl};
  max-width: 600px;
  width: 100%;
  border: 3px solid
    ${props => (props.isSuccess ? props.theme.colors.success : props.theme.colors.error)};
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
`;

const ResultEmoji = styled.div`
  font-size: 4rem;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const ResultTitle = styled.h1<{ isSuccess: boolean }>`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => (props.isSuccess ? props.theme.colors.success : props.theme.colors.error)};
`;

const ResultSubtitle = styled.p`
  font-size: 1.2rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const PerformanceSection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const PerformanceTitle = styled.h3`
  font-size: 1.3rem;
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
`;

const PerformanceBar = styled.div<{ percentage: number; color: string }>`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: ${props => props.theme.spacing.sm};

  &::after {
    content: '';
    display: block;
    width: ${props => props.percentage}%;
    height: 100%;
    background: ${props => props.color};
    transition: width 1s ease-out;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;

  ${props =>
    props.variant === 'primary'
      ? `
    background: linear-gradient(45deg, ${props.theme.colors.primary}, ${props.theme.colors.secondary});
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(76, 175, 80, 0.3);
    }
  `
      : `
    background: transparent;
    color: ${props.theme.colors.text};
    border: 2px solid ${props.theme.colors.textSecondary};
    
    &:hover {
      border-color: ${props.theme.colors.primary};
      background: rgba(76, 175, 80, 0.1);
    }
  `}
`;

const Achievements = styled.div`
  margin: ${props => props.theme.spacing.lg} 0;
`;

const AchievementBadge = styled.div`
  display: inline-block;
  background: linear-gradient(45deg, #ffd700, #ffa500);
  color: #333;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  margin: 4px;
  font-size: 0.9rem;
`;

interface SessionCompletionProps {
  languageCode: string;
}

export const SessionCompletion: React.FC<SessionCompletionProps> = ({ languageCode }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentSession, progress } = useSelector((state: RootState) => state.session);

  if (!currentSession) {
    navigate(`/sessions/${languageCode}`);
    return null;
  }

  const isSuccess = progress.score >= currentSession.requiredScore;
  const accuracy =
    progress.wordsCompleted > 0 ? (progress.correctAnswers / progress.wordsCompleted) * 100 : 0;

  const timePerWord =
    progress.wordsCompleted > 0 ? progress.timeElapsed / progress.wordsCompleted : 0;

  const achievements = [];
  if (accuracy === 100) achievements.push('🎯 Perfect Score');
  if (progress.longestStreak >= 10) achievements.push('🔥 10+ Streak');
  if (timePerWord < 5) achievements.push('⚡ Speed Demon');
  if (progress.hintsUsed === 0) achievements.push('🧠 No Hints Needed');
  if (isSuccess) achievements.push('⭐ Session Complete');

  const handleTryAgain = () => {
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}`);
  };

  const handleNextSession = () => {
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}`);
  };

  const handleBackToLanguages = () => {
    dispatch(resetSession());
    navigate('/');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container>
      <ResultCard isSuccess={isSuccess}>
        <ResultEmoji>{isSuccess ? '🎉' : '💪'}</ResultEmoji>

        <ResultTitle isSuccess={isSuccess}>
          {isSuccess ? 'Mission Complete!' : 'Keep Training!'}
        </ResultTitle>

        <ResultSubtitle>
          {isSuccess
            ? `You crushed the ${currentSession.name} challenge!`
            : `You scored ${progress.score}/${currentSession.requiredScore} points. Almost there!`}
        </ResultSubtitle>

        <StatsGrid>
          <StatItem>
            <StatValue>{progress.score}</StatValue>
            <StatLabel>Final Score</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{Math.round(accuracy)}%</StatValue>
            <StatLabel>Accuracy</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{progress.longestStreak}</StatValue>
            <StatLabel>Best Streak</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{formatTime(progress.timeElapsed)}</StatValue>
            <StatLabel>Time</StatLabel>
          </StatItem>
        </StatsGrid>

        <PerformanceSection>
          <PerformanceTitle>Performance Breakdown</PerformanceTitle>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Accuracy</span>
              <span>{Math.round(accuracy)}%</span>
            </div>
            <PerformanceBar percentage={accuracy} color="#4CAF50" />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Score Progress</span>
              <span>{Math.round((progress.score / currentSession.requiredScore) * 100)}%</span>
            </div>
            <PerformanceBar
              percentage={(progress.score / currentSession.requiredScore) * 100}
              color={isSuccess ? '#4CAF50' : '#FF9800'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Speed (words/min)</span>
              <span>{Math.round(progress.wordsCompleted / (progress.timeElapsed / 60) || 0)}</span>
            </div>
            <PerformanceBar
              percentage={Math.min(
                100,
                (progress.wordsCompleted / (progress.timeElapsed / 60) || 0) * 10
              )}
              color="#2196F3"
            />
          </div>
        </PerformanceSection>

        {achievements.length > 0 && (
          <Achievements>
            <PerformanceTitle>Achievements Unlocked!</PerformanceTitle>
            {achievements.map((achievement, index) => (
              <AchievementBadge key={index}>{achievement}</AchievementBadge>
            ))}
          </Achievements>
        )}

        <ButtonGroup>
          {isSuccess ? (
            <Button variant="primary" onClick={handleNextSession}>
              🚀 Next Challenge
            </Button>
          ) : (
            <Button variant="primary" onClick={handleTryAgain}>
              🔄 Try Again
            </Button>
          )}
          <Button onClick={handleBackToLanguages}>🌍 Change Language</Button>
        </ButtonGroup>
      </ResultCard>
    </Container>
  );
};
