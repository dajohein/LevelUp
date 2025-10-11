import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { setLanguage, setCurrentModule } from '../store/gameSlice';
import { resetSession, startSession } from '../store/sessionSlice';
import { getModule, getModuleStats } from '../services/moduleService';
import { Navigation } from './Navigation';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  padding-top: 90px; /* Account for Navigation (70px) + extra spacing */
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const ModuleTitle = styled.h1`
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.md};
  font-size: 2.5rem;
`;

const ModuleDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.1rem;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const StatsOverview = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const WordsList = styled.div`
  display: grid;
  gap: ${props => props.theme.spacing.md};
`;

const WordCard = styled.div<{ mastery: number }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-left: 4px solid
    ${props => {
      if (props.mastery >= 80) return '#4caf50';
      if (props.mastery >= 50) return '#ff9800';
      if (props.mastery >= 20) return '#f44336';
      return '#666';
    }};
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const WordInfo = styled.div`
  flex: 1;
`;

const WordTerm = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const WordDefinition = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const MasteryInfo = styled.div`
  text-align: right;
  min-width: 120px;
`;

const MasteryLevel = styled.div<{ level: number }>`
  font-size: 1rem;
  font-weight: bold;
  color: ${props => {
    if (props.level >= 80) return '#4caf50';
    if (props.level >= 50) return '#ff9800';
    if (props.level >= 20) return '#f44336';
    return '#666';
  }};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const MasteryBar = styled.div`
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const MasteryFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${props => {
    if (props.progress >= 80) return '#4caf50';
    if (props.progress >= 50) return '#ff9800';
    if (props.progress >= 20) return '#f44336';
    return '#666';
  }};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  justify-content: center;
  margin-top: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const Button = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
`;

interface ModuleProgressViewProps {}

export const ModuleProgressView: React.FC<ModuleProgressViewProps> = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId: string }>();
  const wordProgress = useSelector((state: RootState) => state.game.wordProgress);

  const handleMixedPractice = () => {
    if (!languageCode) return;

    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(null)); // No specific module for mixed practice
    dispatch(resetSession());
    // Start a Deep Dive session for mixed practice (good balance of words and time)
    dispatch(startSession('deep-dive'));
    // Navigate directly to the game for mixed practice
    navigate(`/game/${languageCode}/session`);
  };

  const module = useMemo(() => {
    if (!languageCode || !moduleId) return null;
    return getModule(languageCode, moduleId);
  }, [languageCode, moduleId]);

  const stats = useMemo(() => {
    if (!languageCode || !moduleId) return null;
    return getModuleStats(languageCode, moduleId, wordProgress);
  }, [languageCode, moduleId, wordProgress]);

  const wordsWithProgress = useMemo(() => {
    if (!module) return [];

    return module.words
      .map(word => {
        const progress = wordProgress[word.id];
        const xp = progress?.xp || 0;
        const mastery = Math.min(100, xp); // XP directly translates to mastery percentage

        return {
          ...word,
          mastery,
          xp,
          practiced: !!progress,
        };
      })
      .sort((a, b) => b.mastery - a.mastery); // Sort by mastery level, highest first
  }, [module, wordProgress]);

  if (!module || !stats || !languageCode || !moduleId) {
    return (
      <Container>
        <Navigation />
        <ContentWrapper>
          <div>Module not found</div>
        </ContentWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Navigation />

      <ContentWrapper>
        <Header>
          <ModuleTitle>
            {module.icon} {module.name}
          </ModuleTitle>
          <ModuleDescription>{module.description}</ModuleDescription>

          <ActionButtons>
            <Button onClick={() => navigate(`/sessions/${languageCode}/${moduleId}`)}>
              🎯 Start Practice Session
            </Button>
            <Button
              onClick={handleMixedPractice}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              🔀 Mixed Practice
            </Button>
          </ActionButtons>
        </Header>

        <StatsOverview>
          <StatCard>
            <StatValue>
              {stats.wordsLearned}/{stats.totalWords}
            </StatValue>
            <StatLabel>Words Learned</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.completionPercentage}%</StatValue>
            <StatLabel>Progress</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.averageMastery}%</StatValue>
            <StatLabel>Average Mastery</StatLabel>
          </StatCard>
        </StatsOverview>

        <WordsList>
          {wordsWithProgress.map(word => (
            <WordCard key={word.id} mastery={word.mastery}>
              <WordInfo>
                <WordTerm>{word.term}</WordTerm>
                <WordDefinition>{word.definition}</WordDefinition>
              </WordInfo>
              <MasteryInfo>
                <MasteryLevel level={word.mastery}>
                  {word.practiced ? `${word.mastery}%` : 'Not practiced'}
                </MasteryLevel>
                <MasteryBar>
                  <MasteryFill progress={word.mastery} />
                </MasteryBar>
              </MasteryInfo>
            </WordCard>
          ))}
        </WordsList>
      </ContentWrapper>
    </Container>
  );
};
