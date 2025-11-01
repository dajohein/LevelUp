import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { resetSession } from '../store/sessionSlice';
import { SessionAnalytics } from './SessionAnalytics';
import { Confetti } from './animations/Confetti';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.md};
  padding-top: ${props => props.theme.spacing.xl};
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
  text-align: center;
  gap: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.lg};
    gap: ${props => props.theme.spacing.md};
  }
`;

const ResultCard = styled.div<{ isSuccess: boolean }>`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  max-width: 500px;
  width: 100%;
  border: 2px solid
    ${props => (props.isSuccess ? props.theme.colors.success : props.theme.colors.error)};
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    margin: 0 ${props => props.theme.spacing.sm};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props =>
      props.isSuccess
        ? `linear-gradient(90deg, ${props.theme.colors.success}, ${props.theme.colors.primary})`
        : `linear-gradient(90deg, ${props.theme.colors.error}, #ff6b6b)`};
  }
`;

const ResultEmoji = styled.div`
  font-size: 3rem;
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2.5rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }
`;

const ResultTitle = styled.h1<{ isSuccess: boolean }>`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.sm};
  color: ${props => (props.isSuccess ? props.theme.colors.success : props.theme.colors.error)};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
  }
`;

const ResultSubtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.sm};
  }
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: ${props => props.theme.spacing.md};
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
  }
`;

const StatValue = styled.div`
  font-size: 1.6rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 2px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
  justify-content: center;
  margin-top: ${props => props.theme.spacing.md};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
  position: relative;
  overflow: hidden;

  ${props =>
    props.variant === 'primary'
      ? `
    background: linear-gradient(45deg, ${props.theme.colors.primary}, ${props.theme.colors.secondary});
    color: white;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  `
      : `
    background: rgba(255, 255, 255, 0.05);
    color: ${props.theme.colors.text};
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: ${props.theme.colors.primary};
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
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 600;
  margin: 2px;
  font-size: 0.8rem;
`;

const AnalyticsContainer = styled.div`
  width: 100%;
  max-width: 500px;
  margin-top: ${props => props.theme.spacing.md};
`;

interface SessionCompletionProps {
  languageCode: string;
  moduleId?: string;
}

export const SessionCompletion: React.FC<SessionCompletionProps> = ({ languageCode, moduleId }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { progress, currentSession } = useSelector((state: RootState) => state.session);

  useEffect(() => {
    if (!currentSession && !isNavigating) {
      setIsNavigating(true);
      const sessionRoute = moduleId
        ? `/sessions/${languageCode}/${moduleId}`
        : `/sessions/${languageCode}`;
      navigate(sessionRoute);
    }
  }, [currentSession, isNavigating, moduleId, languageCode, navigate]);

  if (!currentSession) {
    // If we're navigating and currentSession is null, show loading
    return <div>Navigating...</div>;
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
    setIsNavigating(true);
    const sessionRoute = moduleId
      ? `/sessions/${languageCode}/${moduleId}`
      : `/sessions/${languageCode}`;
    navigate(sessionRoute, {
      state: {
        fromSessionCompletion: true,
        shouldResetSession: true,
      },
    });
  };

  const handleNextSession = () => {
    setIsNavigating(true);
    // Restart the same session (keep moduleId if present)
    const sessionRoute = moduleId
      ? `/sessions/${languageCode}/${moduleId}`
      : `/sessions/${languageCode}`;

    navigate(sessionRoute, {
      state: {
        fromSessionCompletion: true,
        shouldResetSession: true,
        restartSameSession: true,
      },
    });
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
      {/* Confetti for successful session completion */}
      {isSuccess && <Confetti count={100} duration={5000} />}

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

      {/* Enhanced Learning Analytics - Moved below buttons for better UX */}
      <AnalyticsContainer>
        <SessionAnalytics
          languageCode={languageCode}
          showRecommendations={true}
          showWeeklyProgress={true}
        />
      </AnalyticsContainer>
    </Container>
  );
};
