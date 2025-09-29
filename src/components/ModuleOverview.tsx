import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../store/store';
import { setLanguage, setCurrentModule } from '../store/gameSlice';
import { resetSession } from '../store/sessionSlice';
import { Navigation } from './Navigation';
import { getLanguageInfo, getModulesForLanguage, getModuleStats } from '../services/moduleService';

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
  position: relative;
`;

const PracticeButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background: ${props => props.theme.colors.secondary};
    transform: translateY(-50%) translateY(-2px);
  }
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



const ModulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.xl};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const ModuleCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  text-align: left;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }
`;

const ModuleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
  width: 100%;
`;

const ModuleIcon = styled.span`
  font-size: 2rem;
`;

const ModuleInfo = styled.div`
  flex: 1;
`;

const ModuleName = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 1.3rem;
`;

const ModuleDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: ${props => props.theme.spacing.xs} 0;
  font-size: 0.9rem;
`;

const DifficultyBadge = styled.span<{ difficulty: string }>`
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background-color: ${props => {
    switch (props.difficulty) {
      case 'beginner': return '#4caf50';
      case 'intermediate': return '#ff9800';
      case 'advanced': return '#f44336';
      default: return '#9e9e9e';
    }
  }};
  color: white;
`;

const StatsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
  margin-top: auto;
`;

const ModuleActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.sm};
`;

const QuickPracticeButton = styled.button`
  flex: 1;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.sm};
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.secondary};
  }
`;

const ViewDetailsButton = styled.button`
  flex: 2;
  background: rgba(255, 255, 255, 0.1);
  color: ${props => props.theme.colors.text};
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: ${props => props.theme.spacing.sm};
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatLabel = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const StatValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background-color: ${props => props.theme.colors.primary};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.textSecondary};
`;

export const ModuleOverview: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { languageCode } = useParams<{ languageCode: string }>();
  
  const wordProgress = useSelector((state: RootState) => state.game.wordProgress);
  
  const language = useMemo(() => {
    if (!languageCode) return null;
    return getLanguageInfo(languageCode);
  }, [languageCode]);
  
  const modules = useMemo(() => {
    if (!languageCode) return [];
    return getModulesForLanguage(languageCode);
  }, [languageCode]);

  const handleModuleClick = (moduleId: string) => {
    if (!languageCode) return;
    
    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(moduleId));
    navigate(`/language/${languageCode}/${moduleId}`);
  };

  const handleMixedPractice = () => {
    if (!languageCode) return;
    
    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(null)); // No specific module for mixed practice
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}`);
  };

  const handleModulePractice = (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the module click
    if (!languageCode) return;
    
    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(moduleId));
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}/${moduleId}`);
  };



  if (!language || !languageCode) {
    return (
      <OverviewContainer>
        <Navigation />
        <ContentWrapper>
          <EmptyState>
            <h2>Language not found</h2>
            <p>The requested language could not be found.</p>
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
            <span>{language.flag}</span>
            {language.name} Modules
          </LanguageTitle>
          <PracticeButton onClick={handleMixedPractice}>
            🎯 Mixed Practice
          </PracticeButton>
        </Header>

        {modules.length === 0 ? (
          <EmptyState>
            <h3>No modules available</h3>
            <p>Modules for this language are coming soon!</p>
          </EmptyState>
        ) : (
          <ModulesGrid>
            {modules.map((module) => {
              const stats = getModuleStats(languageCode!, module.id, wordProgress);
              
              return (
                <ModuleCard key={module.id}>
                  <ModuleHeader>
                    <ModuleIcon>{module.icon}</ModuleIcon>
                    <ModuleInfo>
                      <ModuleName>{module.name}</ModuleName>
                      <ModuleDescription>{module.description}</ModuleDescription>
                    </ModuleInfo>
                    <DifficultyBadge difficulty={module.difficulty}>
                      {module.difficulty}
                    </DifficultyBadge>
                  </ModuleHeader>

                  <StatsContainer>
                    <StatRow>
                      <StatLabel>Words</StatLabel>
                      <StatValue>{stats.wordsLearned}/{stats.totalWords}</StatValue>
                    </StatRow>
                    
                    <ProgressBar>
                      <ProgressFill progress={stats.completionPercentage} />
                    </ProgressBar>
                    
                    <StatRow>
                      <StatLabel>Progress</StatLabel>
                      <StatValue>{stats.completionPercentage}%</StatValue>
                    </StatRow>
                    
                    <StatRow>
                      <StatLabel>Mastery</StatLabel>
                      <StatValue>{stats.averageMastery}%</StatValue>
                    </StatRow>

                    <ModuleActions>
                      <QuickPracticeButton onClick={(e) => handleModulePractice(module.id, e)}>
                        🎯 Practice
                      </QuickPracticeButton>
                      <ViewDetailsButton onClick={() => handleModuleClick(module.id)}>
                        📊 View Details
                      </ViewDetailsButton>
                    </ModuleActions>
                  </StatsContainer>
                </ModuleCard>
              );
            })}
          </ModulesGrid>
        )}
      </ContentWrapper>
    </OverviewContainer>
  );
};