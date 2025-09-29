import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { RootState } from '../store/store';
import { setLanguage } from '../store/gameSlice';
import { resetSession } from '../store/sessionSlice';
import { Navigation } from './Navigation';
import { words } from '../services/wordService';

const OverviewContainer = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  padding-top: 90px; /* Account for Navigation */
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const LanguageTitle = styled.h1`
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.md};
  font-size: 2.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const StatCard = styled.div`
  background-color: ${props => props.theme.colors.surface};
  padding: ${props => props.theme.spacing.lg};
  border-radius: 12px;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const WordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const WordCard = styled.div<{ masteryLevel: number }>`
  background-color: ${props => props.theme.colors.surface};
  padding: ${props => props.theme.spacing.md};
  border-radius: 8px;
  border-left: 4px solid ${props => {
    if (props.masteryLevel >= 80) return props.theme.colors.success;
    if (props.masteryLevel >= 50) return props.theme.colors.primary;
    if (props.masteryLevel >= 20) return '#ff9500'; // orange
    return props.theme.colors.error;
  }};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const WordTerm = styled.div`
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};
  font-size: 1.1rem;
`;

const WordDefinition = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const MasteryInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${props => props.theme.spacing.sm};
`;

const MasteryBar = styled.div<{ level: number }>`
  flex: 1;
  height: 6px;
  background-color: ${props => props.theme.colors.background};
  border-radius: 3px;
  overflow: hidden;
  margin-right: ${props => props.theme.spacing.sm};

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.level}%;
    background-color: ${props => {
      if (props.level >= 80) return props.theme.colors.success;
      if (props.level >= 50) return props.theme.colors.primary;
      if (props.level >= 20) return '#ff9500';
      return props.theme.colors.error;
    }};
    transition: width 0.3s ease;
  }
`;

const MasteryLevel = styled.span<{ level: number }>`
  font-size: 0.8rem;
  font-weight: bold;
  color: ${props => {
    if (props.level >= 80) return props.theme.colors.success;
    if (props.level >= 50) return props.theme.colors.primary;
    if (props.level >= 20) return '#ff9500';
    return props.theme.colors.error;
  }};
`;

const ActionSection = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.lg};
  justify-content: center;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;

  background-color: ${props => 
    props.variant === 'secondary' 
      ? props.theme.colors.surface 
      : props.theme.colors.primary
  };
  color: ${props => 
    props.variant === 'secondary' 
      ? props.theme.colors.text 
      : props.theme.colors.background
  };
  border: 2px solid ${props => 
    props.variant === 'secondary' 
      ? props.theme.colors.primary 
      : 'transparent'
  };

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    background-color: ${props => 
      props.variant === 'secondary' 
        ? props.theme.colors.primary 
        : props.theme.colors.secondary
    };
    color: ${props => props.theme.colors.background};
  }

  &:active {
    transform: translateY(0);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.textSecondary};
`;

const FilterSection = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};
  flex-wrap: wrap;
  justify-content: center;
`;

const FilterButton = styled.button<{ active: boolean }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 20px;
  background-color: ${props => 
    props.active ? props.theme.colors.primary : 'transparent'
  };
  color: ${props => 
    props.active ? props.theme.colors.background : props.theme.colors.primary
  };
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.background};
  }
`;

type MasteryFilter = 'all' | 'learning' | 'practiced' | 'mastered';

export const LanguageOverview: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  
  const { wordProgress } = useSelector((state: RootState) => state.game);
  const [filter, setFilter] = React.useState<MasteryFilter>('all');

  // Check if we're coming from a session completion
  React.useEffect(() => {
    const state = location.state as any;
    if (state?.fromSessionCompletion) {
      // Reset the session if requested
      if (state.shouldResetSession) {
        dispatch(resetSession());
      }
      
      // Clear the state to prevent showing again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate, dispatch]);

  // Get language data
  const languageData = useMemo(() => {
    if (!language || !words[language]) return null;
    return words[language];
  }, [language]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!languageData) return null;

    const totalWords = languageData.words.length;
    const studiedWords = Object.keys(wordProgress).length;
    const masteredWords = Object.values(wordProgress).filter(p => p.xp >= 80).length;
    const averageXP = studiedWords > 0 
      ? Math.round(Object.values(wordProgress).reduce((sum, p) => sum + p.xp, 0) / studiedWords)
      : 0;

    return {
      totalWords,
      studiedWords,
      masteredWords,
      averageXP,
      completionRate: Math.round((masteredWords / totalWords) * 100)
    };
  }, [languageData, wordProgress]);

  // Get filtered words
  const filteredWords = useMemo(() => {
    if (!languageData) return [];

    const wordsWithProgress = languageData.words.map(word => ({
      ...word,
      progress: wordProgress[word.id] || { wordId: word.id, xp: 0, lastPracticed: '', timesCorrect: 0, timesIncorrect: 0 }
    }));

    switch (filter) {
      case 'learning':
        return wordsWithProgress.filter(w => w.progress.xp > 0 && w.progress.xp < 50);
      case 'practiced':
        return wordsWithProgress.filter(w => w.progress.xp >= 50 && w.progress.xp < 80);
      case 'mastered':
        return wordsWithProgress.filter(w => w.progress.xp >= 80);
      default:
        return wordsWithProgress.sort((a, b) => b.progress.xp - a.progress.xp);
    }
  }, [languageData, wordProgress, filter]);

  const handleStartSession = () => {
    if (language) {
      navigate(`/sessions/${language}`);
    }
  };

  const handleContinueLearning = () => {
    if (language) {
      dispatch(setLanguage(language));
      navigate(`/game/${language}`);
    }
  };

  if (!language || !languageData) {
    return (
      <OverviewContainer>
        <Navigation />
        <ContentWrapper>
          <EmptyState>
            <h2>Language not found</h2>
            <ActionButton onClick={() => navigate('/')}>
              Back to Language Selection
            </ActionButton>
          </EmptyState>
        </ContentWrapper>
      </OverviewContainer>
    );
  }

  return (
    <OverviewContainer>
      <Navigation />
      <ContentWrapper>
        <Header>
          <LanguageTitle>
            <span>{languageData.flag}</span>
            {languageData.name}
          </LanguageTitle>
        </Header>

        {stats && (
          <StatsGrid>
            <StatCard>
              <StatValue>{stats.totalWords}</StatValue>
              <StatLabel>Total Words</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.studiedWords}</StatValue>
              <StatLabel>Words Studied</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.masteredWords}</StatValue>
              <StatLabel>Words Mastered</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.averageXP}</StatValue>
              <StatLabel>Average XP</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{stats.completionRate}%</StatValue>
              <StatLabel>Completion Rate</StatLabel>
            </StatCard>
          </StatsGrid>
        )}

        <ActionSection>
          <ActionButton onClick={handleStartSession}>
            🎯 Start New Session
          </ActionButton>
          <ActionButton variant="secondary" onClick={handleContinueLearning}>
            📚 Continue Learning
          </ActionButton>
        </ActionSection>

        <SectionTitle>
          📖 Vocabulary Progress
        </SectionTitle>

        <FilterSection>
          <FilterButton 
            active={filter === 'all'} 
            onClick={() => setFilter('all')}
          >
            All Words ({languageData.words.length})
          </FilterButton>
          <FilterButton 
            active={filter === 'learning'} 
            onClick={() => setFilter('learning')}
          >
            Learning ({languageData.words.filter(w => {
              const progress = wordProgress[w.id];
              return progress && progress.xp > 0 && progress.xp < 50;
            }).length})
          </FilterButton>
          <FilterButton 
            active={filter === 'practiced'} 
            onClick={() => setFilter('practiced')}
          >
            Practiced ({languageData.words.filter(w => {
              const progress = wordProgress[w.id];
              return progress && progress.xp >= 50 && progress.xp < 80;
            }).length})
          </FilterButton>
          <FilterButton 
            active={filter === 'mastered'} 
            onClick={() => setFilter('mastered')}
          >
            Mastered ({languageData.words.filter(w => {
              const progress = wordProgress[w.id];
              return progress && progress.xp >= 80;
            }).length})
          </FilterButton>
        </FilterSection>

        {filteredWords.length > 0 ? (
          <WordGrid>
            {filteredWords.map(word => (
              <WordCard key={word.id} masteryLevel={word.progress.xp}>
                <WordTerm>{word.term}</WordTerm>
                <WordDefinition>{word.definition}</WordDefinition>
                <MasteryInfo>
                  <MasteryBar level={word.progress.xp} />
                  <MasteryLevel level={word.progress.xp}>
                    {word.progress.xp} XP
                  </MasteryLevel>
                </MasteryInfo>
              </WordCard>
            ))}
          </WordGrid>
        ) : (
          <EmptyState>
            <p>No words match the current filter.</p>
            <p>Start learning to see your progress here!</p>
          </EmptyState>
        )}
      </ContentWrapper>
    </OverviewContainer>
  );
};