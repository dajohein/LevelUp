import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { startSession, sessionTypes, setLanguage } from '../store/sessionSlice';
import { Navigation } from './Navigation';
import { words } from '../services/wordService';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: ${props => props.theme.spacing.xl};
  padding-top: calc(60px + ${props => props.theme.spacing.xl}); /* Account for fixed navigation */
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.sm};
  background: linear-gradient(45deg, #4caf50, #81c784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const SessionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  max-width: 1200px;
  width: 100%;
`;

const SessionCard = styled.div<{ difficulty: string; isCompleted: boolean }>`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;

  ${props =>
    props.isCompleted &&
    `
    border-color: ${props.theme.colors.success};
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.05) 100%);
  `}

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: ${props => {
      switch (props.difficulty) {
        case 'beginner':
          return '#4CAF50';
        case 'intermediate':
          return '#FF9800';
        case 'advanced':
          return '#F44336';
        case 'expert':
          return '#9C27B0';
        default:
          return props.theme.colors.primary;
      }
    }};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => {
      switch (props.difficulty) {
        case 'beginner':
          return 'linear-gradient(90deg, #4CAF50, #81C784)';
        case 'intermediate':
          return 'linear-gradient(90deg, #FF9800, #FFB74D)';
        case 'advanced':
          return 'linear-gradient(90deg, #F44336, #EF5350)';
        case 'expert':
          return 'linear-gradient(90deg, #9C27B0, #BA68C8)';
        default:
          return props.theme.colors.primary;
      }
    }};
  }
`;

const SessionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const SessionEmoji = styled.span`
  font-size: 2.5rem;
`;

const SessionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const CompletedBadge = styled.div`
  background: ${props => props.theme.colors.success};
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const SessionDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.lg};
  line-height: 1.5;
`;

const SessionStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
`;

const DifficultyBadge = styled.span<{ difficulty: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.difficulty) {
      case 'beginner':
        return 'rgba(76, 175, 80, 0.2)';
      case 'intermediate':
        return 'rgba(255, 152, 0, 0.2)';
      case 'advanced':
        return 'rgba(244, 67, 54, 0.2)';
      case 'expert':
        return 'rgba(156, 39, 176, 0.2)';
      default:
        return 'rgba(76, 175, 80, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.difficulty) {
      case 'beginner':
        return '#4CAF50';
      case 'intermediate':
        return '#FF9800';
      case 'advanced':
        return '#F44336';
      case 'expert':
        return '#9C27B0';
      default:
        return '#4CAF50';
    }
  }};
`;

const SpecialRules = styled.div`
  margin-top: ${props => props.theme.spacing.md};
`;

const RuleItem = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;

  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: ${props => props.theme.colors.primary};
  }
`;

const WeeklyChallenge = styled.div`
  background: linear-gradient(135deg, #9c27b0 0%, #e91e63 100%);
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  text-align: center;
  color: white;
  margin-bottom: ${props => props.theme.spacing.xl};
  box-shadow: 0 8px 24px rgba(156, 39, 176, 0.3);
`;

const ChallengeTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: ${props => props.theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
`;

const ChallengeStats = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: ${props => props.theme.spacing.md};
`;

interface SessionSelectProps {
  languageCode: string;
}

export const SessionSelect: React.FC<SessionSelectProps> = ({ languageCode }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { completedSessionsByLanguage, weeklyChallengeBylanguage } = useSelector(
    (state: RootState) => state.session
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language data when component loads
  useEffect(() => {
    if (languageCode) {
      dispatch(setLanguage(languageCode));
      // Small delay to ensure Redux state is updated
      setTimeout(() => setIsInitialized(true), 100);
    }
  }, [dispatch, languageCode]);

  // Get language-specific data
  const completedSessions = completedSessionsByLanguage[languageCode] || [];
  const weeklyChallenge = weeklyChallengeBylanguage[languageCode] || {
    isActive: false,
    targetScore: 2500,
    currentScore: 0,
    rank: 0,
  };

  // Don't render until initialized
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  // Language flags mapping
  const languageFlags: { [key: string]: string } = {
    es: '🇪🇸',
    de: '🇩🇪',
  };

  // Get language name and flag
  const langData = words[languageCode];
  const languageName = langData?.name || '';
  const languageFlag = languageFlags[languageCode] || '';

  const handleSessionStart = (sessionId: string) => {
    dispatch(startSession(sessionId));
    navigate(`/game/${languageCode}/session`);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'No limit';
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <>
      <Navigation languageName={languageName} languageFlag={languageFlag} />
      <Container>
        <Header>
          <Title>Choose Your Challenge</Title>
          <Subtitle>Pick a session type and start your learning journey!</Subtitle>
        </Header>

        {weeklyChallenge && weeklyChallenge.isActive && (
          <WeeklyChallenge>
            <ChallengeTitle>⚔️ Weekly Boss Battle</ChallengeTitle>
            <p>Ultimate challenge for true language warriors!</p>
            <ChallengeStats>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {weeklyChallenge.currentScore}
                </div>
                <div style={{ opacity: 0.8 }}>Your Best</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  #{weeklyChallenge.rank || '?'}
                </div>
                <div style={{ opacity: 0.8 }}>Rank</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {weeklyChallenge.targetScore}
                </div>
                <div style={{ opacity: 0.8 }}>Target</div>
              </div>
            </ChallengeStats>
          </WeeklyChallenge>
        )}

        <SessionGrid>
          {sessionTypes.map(session => {
            const isCompleted = completedSessions.includes(session.id);

            return (
              <SessionCard
                key={session.id}
                difficulty={session.difficulty}
                isCompleted={isCompleted}
                onClick={() => handleSessionStart(session.id)}
              >
                <SessionHeader>
                  <SessionEmoji>{session.emoji}</SessionEmoji>
                  <SessionTitle>{session.name}</SessionTitle>
                  {isCompleted && <CompletedBadge>✓ Done</CompletedBadge>}
                </SessionHeader>

                <SessionDescription>{session.description}</SessionDescription>

                <SessionStats>
                  <StatItem>
                    <StatValue>{session.targetWords === -1 ? '∞' : session.targetWords}</StatValue>
                    <StatLabel>Words</StatLabel>
                  </StatItem>
                  <StatItem>
                    <StatValue>{formatTime(session.timeLimit)}</StatValue>
                    <StatLabel>Time Limit</StatLabel>
                  </StatItem>
                </SessionStats>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <DifficultyBadge difficulty={session.difficulty}>
                    {session.difficulty}
                  </DifficultyBadge>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                      {session.requiredScore} pts
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Target Score</div>
                  </div>
                </div>

                <SpecialRules>
                  {session.specialRules?.map((rule, index) => (
                    <RuleItem key={index}>{rule}</RuleItem>
                  ))}
                </SpecialRules>
              </SessionCard>
            );
          })}
        </SessionGrid>
      </Container>
    </>
  );
};
