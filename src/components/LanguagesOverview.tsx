import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { FaGlobeAmericas } from 'react-icons/fa';
import { getAvailableLanguages, getModulesForLanguage } from '../services/moduleService';
import { calculateCurrentLevel, getLevelInfo } from '../services/levelService';
import { DataMigrationService } from '../services/dataMigrationService';
import { Navigation } from './Navigation';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xl};
  padding-top: 90px; /* Account for Navigation (70px) + extra spacing */
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
  z-index: 1;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 3rem;
  margin-bottom: ${props => props.theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.lg};
  font-weight: 600;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.1rem;
  margin-bottom: ${props => props.theme.spacing.lg};
  max-width: 500px;
  line-height: 1.6;
  text-align: center;
`;

const StatsOverview = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.xl};
  flex-wrap: wrap;
  justify-content: center;
`;

const StatBadge = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const LanguageGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${props => props.theme.spacing.lg};
  max-width: 800px;
`;

const LanguageCard = styled.button`
  background-color: ${props => props.theme.colors.surface};
  border: 2px solid transparent;
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.xl};
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2);
  }
`;

const CardHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
`;

const FlagEmoji = styled.span`
  font-size: 2.5rem;
  margin-bottom: ${props => props.theme.spacing.md};
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
`;

const LanguageName = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 1.2rem;
  margin-bottom: ${props => props.theme.spacing.xs};
  font-weight: 600;
  text-align: center;
`;

const LanguageFrom = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  z-index: 2;
  width: 100%;
`;

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  width: 100%;
`;

const LevelBadge = styled.div`
  position: absolute;
  top: ${props => props.theme.spacing.md};
  left: ${props => props.theme.spacing.md};
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(147, 51, 234, 0.9) 100%);
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
`;

// Removed unused styled component: XPInfo

const QuickStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  font-size: 0.95rem;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

// Removed unused styled components: XPInfo, ProgressDot

// Brain icon progress indicator
const BrainProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BrainIcon = styled.span<{ filled: boolean; partial?: boolean }>`
  font-size: 16px;
  transition: all 0.3s ease;
  position: relative;
  display: inline-block;
  
  /* Visual states based on progress */
  opacity: ${props => 
    props.filled 
      ? '1' 
      : props.partial 
      ? '0.7' 
      : '0.3'};
      
  filter: ${props => 
    props.filled 
      ? 'hue-rotate(0deg) saturate(1.2) brightness(1.1)' 
      : props.partial 
      ? 'hue-rotate(30deg) saturate(0.8) brightness(0.9)' 
      : 'grayscale(0.8) brightness(0.5)'};
      
  transform: ${props => 
    props.filled 
      ? 'scale(1.15)' 
      : props.partial 
      ? 'scale(1.05)' 
      : 'scale(0.95)'};

  /* Add a subtle glow for filled brains */
  ${props => props.filled && `
    text-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
  `}

  /* Add a gentle pulse for partial brains */
  ${props => props.partial && `
    animation: brainPulse 2s ease-in-out infinite;
    text-shadow: 0 0 4px rgba(255, 152, 0, 0.3);
  `}

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 14px;
  }

  @keyframes brainPulse {
    0%, 100% { 
      opacity: 0.7; 
      transform: scale(1.05);
    }
    50% { 
      opacity: 0.9; 
      transform: scale(1.1);
    }
  }
`;

const ProgressText = styled.span`
  margin-left: 6px;
  font-size: 0.85rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.8rem;
  }
`;

const ModuleCount = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.85rem;
  font-weight: 400;
  opacity: 0.9;
  text-align: center;
`;

const ActivityIndicator = styled.div<{ active: boolean }>`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => (props.active ? '#4caf50' : 'rgba(255, 255, 255, 0.3)')};
  box-shadow: ${props => (props.active ? '0 0 8px rgba(76, 175, 80, 0.6)' : 'none')};
`;

// Brain progress component
const BrainProgress: React.FC<{ progress: number }> = ({ progress }) => {
  // Determine how many brains to fill and their states based on progress (0-100)
  const getBrainStates = (progress: number) => {
    if (progress === 0) return ['🧠', '🧠', '🧠']; // All dim
    if (progress <= 25) return ['🧠', '🧠', '🧠']; // First partial
    if (progress <= 50) return ['🧠', '🧠', '🧠']; // First full, second partial
    if (progress <= 75) return ['🧠', '🧠', '🧠']; // Two full, third partial
    return ['🧠', '🧠', '🧠']; // All full
  };

  const getBrainFillStates = (progress: number) => {
    const states = [];
    
    // First brain: 0-33%
    if (progress <= 0) states.push(false);
    else if (progress <= 33) states.push('partial');
    else states.push(true);
    
    // Second brain: 34-66%
    if (progress <= 33) states.push(false);
    else if (progress <= 66) states.push('partial');
    else states.push(true);
    
    // Third brain: 67-100%
    if (progress <= 66) states.push(false);
    else if (progress < 100) states.push('partial');
    else states.push(true);
    
    return states;
  };

  const brainEmojis = getBrainStates(progress);
  const fillStates = getBrainFillStates(progress);

  return (
    <BrainProgressContainer>
      {brainEmojis.map((emoji, index) => (
        <BrainIcon 
          key={index}
          filled={fillStates[index] === true}
          partial={fillStates[index] === 'partial'}
        >
          {emoji}
        </BrainIcon>
      ))}
      <ProgressText>
        {progress > 75 ? 'Expert' : progress > 50 ? 'Learning' : progress > 25 ? 'Started' : progress > 0 ? 'Beginner' : 'Start'}
      </ProgressText>
    </BrainProgressContainer>
  );
};

export const LanguagesOverview: React.FC = () => {
  const navigate = useNavigate();
  const languages = getAvailableLanguages();

  const handleLanguageSelect = (languageCode: string) => {
    navigate(`/language/${languageCode}`);
  };

  // Calculate overall stats across all languages
  const overallStats = React.useMemo(() => {
    const allLanguagesProgress = languages.map(({ code }) => {
      const progress = DataMigrationService.safeLoadWordProgress(code);
      const modules = getModulesForLanguage(code);
      const totalWords = modules.reduce((sum, module) => sum + (module.words?.length || 0), 0);
      const practicedWords = Object.keys(progress).filter(wordId => {
        const wordProgress = progress[wordId];
        return wordProgress && wordProgress.xp > 0;
      }).length;
      const totalXP = Object.values(progress).reduce((sum, prog) => sum + (prog?.xp || 0), 0);

      return { totalWords, practicedWords, totalXP };
    });

    const totalWords = allLanguagesProgress.reduce((sum, lang) => sum + lang.totalWords, 0);
    const totalPracticed = allLanguagesProgress.reduce((sum, lang) => sum + lang.practicedWords, 0);
    const totalXP = allLanguagesProgress.reduce((sum, lang) => sum + lang.totalXP, 0);
    const languagesStarted = allLanguagesProgress.filter(lang => lang.totalXP > 0).length;

    return { totalWords, totalPracticed, totalXP, languagesStarted };
  }, [languages]);

  return (
    <>
      <Navigation showUserProfile={true} />
      <Container>
        <Header>
          <Title>
            <FaGlobeAmericas />
            Choose Your Language
          </Title>
          <Subtitle>
            Master new languages through interactive learning. Track your progress, earn
            achievements, and level up your skills across multiple languages!
          </Subtitle>

          {overallStats.totalXP > 0 && (
            <StatsOverview>
              <StatBadge>
                <span>🏆</span>
                {overallStats.totalXP.toLocaleString()} XP
              </StatBadge>
              <StatBadge>
                <span>🌍</span>
                {overallStats.languagesStarted} Language{overallStats.languagesStarted !== 1 ? 's' : ''}
              </StatBadge>
            </StatsOverview>
          )}
        </Header>

        <LanguageGrid>
          {languages.map(({ code, info }) => {
            // Load progress directly from storage for this specific language
            const languageWordProgress = DataMigrationService.safeLoadWordProgress(code);

            // Get actual modules for this language
            const actualModules = getModulesForLanguage(code);

            // Calculate XP and level for this language
            const languageXP = Object.values(languageWordProgress).reduce(
              (sum, progress) => sum + (progress?.xp || 0),
              0
            );
            const currentLevel = calculateCurrentLevel(languageXP);
            const levelInfo = getLevelInfo(currentLevel);

            // Debug: Log XP calculation for verification

            // Calculate basic progress stats
            const totalWords = actualModules.reduce(
              (sum, module) => sum + (module.words?.length || 0),
              0
            );
            const practicedWords = Object.keys(languageWordProgress).filter(wordId => {
              const progress = languageWordProgress[wordId];
              return progress && progress.xp > 0;
            }).length;

            const overallProgress = totalWords > 0 ? (practicedWords / totalWords) * 100 : 0;
            const hasRecentActivity = Object.values(languageWordProgress).some(progress => {
              if (!progress.lastPracticed) return false;
              const lastPracticed = new Date(progress.lastPracticed);
              if (isNaN(lastPracticed.getTime())) return false;
              const daysSince = (Date.now() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
              return daysSince < 7; // Active if practiced within last week
            });

            return (
              <LanguageCard key={code} onClick={() => handleLanguageSelect(code)}>
                <ActivityIndicator active={hasRecentActivity} />

                {languageXP > 0 && (
                  <LevelBadge>
                    <span>{levelInfo.emoji}</span>
                    Level {currentLevel}
                  </LevelBadge>
                )}

                <CardHeader>
                  <FlagEmoji data-flag>{info.flag}</FlagEmoji>
                  <LanguageName>{info.name}</LanguageName>
                  <LanguageFrom>from {info.from}</LanguageFrom>
                </CardHeader>

                <CardContent>
                  {languageXP > 0 ? (
                    <ProgressSection>
                      <QuickStats>
                        <BrainProgress progress={overallProgress} />
                      </QuickStats>
                      <ModuleCount>
                        {practicedWords} words learned
                      </ModuleCount>
                    </ProgressSection>
                  ) : (
                    <ProgressSection>
                      <QuickStats>
                        <span>🚀</span>
                        <span>Start learning!</span>
                      </QuickStats>
                      <ModuleCount>
                        {info.modules?.length || 0} module{(info.modules?.length || 0) !== 1 ? 's' : ''}
                      </ModuleCount>
                    </ProgressSection>
                  )}
                </CardContent>
              </LanguageCard>
            );
          })}
        </LanguageGrid>
      </Container>
    </>
  );
};

// Memoize to prevent re-renders when navigating
export default React.memo(LanguagesOverview);
