import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { startSession, sessionTypes, setLanguage } from '../store/sessionSlice';
import { setCurrentModule } from '../store/gameSlice';
import { Navigation } from './Navigation';
import { SessionAnalytics } from './SessionAnalytics';
import { words } from '../services/wordService';

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  padding-top: 90px; /* Account for Navigation (70px) + extra spacing */
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
  gap: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    padding-top: 70px;
    gap: ${props => props.theme.spacing.md};
  }
`;

const MainContent = styled.div`
  flex: 1;
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const Sidebar = styled.div`
  width: 350px;
  padding: ${props => props.theme.spacing.lg};
  background: rgba(0, 0, 0, 0.3);
  border-left: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

const MobileAnalytics = styled.div`
  display: none;
  width: 100%;
  max-width: 800px;
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    display: block;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-bottom: ${props => props.theme.spacing.md};
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.lg};
  max-width: 800px;
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.xs};
  background: linear-gradient(45deg, #4caf50, #81c784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.8rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const SessionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${props => props.theme.spacing.md};
  max-width: 800px;
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const SessionCard = styled.div<{ difficulty: string; isCompleted: boolean }>`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  display: flex;
  gap: ${props => props.theme.spacing.md};
  min-height: 200px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    flex-direction: column;
    min-height: auto;
    gap: ${props => props.theme.spacing.sm};
  }

  ${props =>
    props.isCompleted &&
    `
    border-color: ${props.theme.colors.success};
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.05) 100%);
  `}

  &:hover {
    transform: translateY(-2px);
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
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const SessionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const SessionActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  min-width: 140px;
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: row;
    justify-content: space-between;
    min-width: auto;
    width: 100%;
  }
`;

const PracticeButton = styled.button<{ difficulty: string }>`
  background: ${props => {
    switch (props.difficulty) {
      case 'beginner':
        return 'linear-gradient(45deg, #4CAF50, #66BB6A)';
      case 'intermediate':
        return 'linear-gradient(45deg, #FF9800, #FFB74D)';
      case 'advanced':
        return 'linear-gradient(45deg, #F44336, #EF5350)';
      case 'expert':
        return 'linear-gradient(45deg, #9C27B0, #BA68C8)';
      default:
        return 'linear-gradient(45deg, #4CAF50, #66BB6A)';
    }
  }};
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-height: ${props => props.theme.touchTarget.minimum};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    font-size: 0.9rem;
    flex: 1;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ScoreDisplay = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const ScoreValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`;

const SessionEmoji = styled.span`
  font-size: 2rem;
`;

const SessionTitle = styled.h3`
  font-size: 1.3rem;
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
  margin-bottom: ${props => props.theme.spacing.md};
  line-height: 1.4;
  font-size: 0.9rem;
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

const WeeklyChallenge = styled.div`
  background: linear-gradient(135deg, #9c27b0 0%, #e91e63 100%);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.md};
  text-align: center;
  color: white;
  margin-bottom: ${props => props.theme.spacing.lg};
  box-shadow: 0 6px 20px rgba(156, 39, 176, 0.3);
  max-width: 800px;
`;

const ChallengeTitle = styled.h2`
  font-size: 1.4rem;
  margin-bottom: ${props => props.theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.xs};
`;

const ChallengeStats = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: ${props => props.theme.spacing.sm};
`;

interface SessionSelectProps {
  languageCode: string;
  moduleId?: string;
}

export const SessionSelect: React.FC<SessionSelectProps> = ({ languageCode, moduleId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { completedSessionsByLanguage, weeklyChallengeBylanguage } = useSelector(
    (state: RootState) => state.session
  );

  // Initialize language data when component loads
  useEffect(() => {
    if (languageCode) {
      dispatch(setLanguage(languageCode));
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

  // Get language name and flag from dynamic language data
  const langData = words[languageCode];
  const languageName = langData?.name || '';
  const languageFlag = langData?.flag || '';

  const handleSessionStart = (sessionId: string) => {
    dispatch(startSession(sessionId));
    
    if (moduleId) {
      dispatch(setCurrentModule(moduleId));
    }
    
    const route = moduleId ? `/game/${languageCode}/${moduleId}` : `/game/${languageCode}/session`;
    navigate(route);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'No limit';
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <>
      <Navigation languageName={languageName} languageFlag={languageFlag} />
      <Container>
        <MainContent>
          <Header>
            <Title>Choose Your Challenge</Title>
            <Subtitle>Pick a session type and start your learning journey!</Subtitle>
          </Header>

          {/* Mobile Analytics - shown on small screens */}
          <MobileAnalytics>
            <SessionAnalytics
              languageCode={languageCode}
              showRecommendations={false}
              showWeeklyProgress={false}
            />
          </MobileAnalytics>

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
                >
                  <SessionContent>
                    <SessionHeader>
                      <SessionEmoji>{session.emoji}</SessionEmoji>
                      <SessionTitle>{session.name}</SessionTitle>
                      {isCompleted && <CompletedBadge>✓ Done</CompletedBadge>}
                    </SessionHeader>

                    <SessionDescription>{session.description}</SessionDescription>

                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <DifficultyBadge difficulty={session.difficulty}>
                        {session.difficulty}
                      </DifficultyBadge>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {session.targetWords === -1 ? '∞' : session.targetWords} words •{' '}
                        {formatTime(session.timeLimit)}
                      </div>
                    </div>
                  </SessionContent>

                  <SessionActions>
                    <ScoreDisplay>
                      <ScoreValue>{session.requiredScore}</ScoreValue>
                      <ScoreLabel>Target Score</ScoreLabel>
                    </ScoreDisplay>

                    <PracticeButton
                      difficulty={session.difficulty}
                      onClick={() => handleSessionStart(session.id)}
                    >
                      Start Practice
                    </PracticeButton>
                  </SessionActions>
                </SessionCard>
              );
            })}
          </SessionGrid>
        </MainContent>

        {/* Desktop Sidebar Analytics */}
        <Sidebar>
          <SessionAnalytics
            languageCode={languageCode}
            showRecommendations={true}
            showWeeklyProgress={true}
          />
        </Sidebar>
      </Container>
    </>
  );
};
