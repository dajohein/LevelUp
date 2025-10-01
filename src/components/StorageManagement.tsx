import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { persistenceUtils } from '../store/persistenceMiddleware';
import {
  isLocalStorageAvailable,
  getStorageInfo,
  clearAllData,
  wordProgressStorage,
} from '../services/storageService';
import { getAvailableLanguages, getModulesForLanguage } from '../services/moduleService';
import { logger } from '../services/logger';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  margin: ${props => props.theme.spacing.md} 0;
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const StorageInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const InfoCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  text-align: center;
`;

const InfoLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const InfoValue = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

const Status = styled.div<{ available: boolean }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  color: ${props =>
    props.available
      ? props.theme.colors.success || '#10b981'
      : props.theme.colors.error || '#ef4444'};
  font-size: 0.9rem;
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '${props => (props.available ? '✓' : '✗')}';
    font-weight: bold;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' | 'secondary' }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => {
    switch (props.variant) {
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      case 'secondary':
        return `
          background: rgba(255, 255, 255, 0.1);
          color: ${props.theme.colors.text};
          &:hover { background: rgba(255, 255, 255, 0.2); }
        `;
      default:
        return `
          background: ${props.theme.colors.primary};
          color: white;
          &:hover { background: ${props.theme.colors.secondary}; }
        `;
    }
  }}
`;

const ProgressDisplay = styled.div`
  margin-top: ${props => props.theme.spacing.md};
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const WordCount = styled.span`
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

const LanguageSection = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding-top: ${props => props.theme.spacing.lg};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const LanguageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.md};
`;

const LanguageCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LanguageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};

  .flag {
    font-size: 1.5rem;
  }

  .name {
    font-weight: bold;
    color: ${props => props.theme.colors.text};
  }
`;

const LanguageStats = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
  font-size: 0.9rem;

  .stat {
    color: ${props => props.theme.colors.textSecondary};

    .value {
      font-weight: bold;
      color: ${props => props.theme.colors.primary};
    }
  }
`;

const ResetButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
`;

const SmallButton = styled(Button)`
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  font-size: 0.8rem;
`;

interface StorageManagementProps {
  compact?: boolean;
}

export const StorageManagement: React.FC<StorageManagementProps> = ({ compact = false }) => {
  const { wordProgress, language } = useSelector((state: RootState) => state.game);
  const { isSessionActive } = useSelector((state: RootState) => state.session);

  const [storageInfo, setStorageInfo] = useState<{ size: number; keys: string[] }>({
    size: 0,
    keys: [],
  });
  const [isClearing, setIsClearing] = useState(false);
  const [showDetails, setShowDetails] = useState(!compact);

  const updateStorageInfo = () => {
    setStorageInfo(getStorageInfo());
  };

  useEffect(() => {
    updateStorageInfo();

    // Update storage info periodically
    const interval = setInterval(updateStorageInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetLanguage = async (languageCode: string, languageName: string) => {
    if (
      !confirm(
        `Are you sure you want to reset ALL progress for ${languageName}? This will delete all your XP, mastery levels, and statistics for this language. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Clear the language-specific progress
      wordProgressStorage.clear(languageCode);

      // Update storage info to reflect changes
      updateStorageInfo();

      // Force page reload to update all components with fresh data
      logger.info(`✅ Reset completed for ${languageName}`);
      alert(`${languageName} progress has been reset. The page will reload to refresh all data.`);
      window.location.reload();
    } catch (error) {
      logger.error(`Failed to reset ${languageName} progress:`, error);
      alert(`Failed to reset ${languageName} progress. Please try again.`);
    }
  };

  const handleResetModule = async (
    languageCode: string,
    moduleId: string,
    languageName: string,
    moduleName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to reset progress for the "${moduleName}" module in ${languageName}? This will delete XP and mastery for all words in this module. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Load current progress for the language
      const currentProgress = wordProgressStorage.load(languageCode);

      // Get all words for this module
      const modules = getModulesForLanguage(languageCode);
      const targetModule = modules.find(m => m.id === moduleId);

      if (targetModule && targetModule.words) {
        // Remove progress for all words in this module
        targetModule.words.forEach(word => {
          delete currentProgress[word.id];
        });

        // Save the updated progress
        wordProgressStorage.save(languageCode, currentProgress);

        updateStorageInfo();
        logger.info(`✅ Reset completed for ${moduleName} module in ${languageName}`);
        alert(`Module "${moduleName}" has been reset. The page will reload to refresh all data.`);
        window.location.reload();
      }
    } catch (error) {
      logger.error(`Failed to reset ${moduleName} module:`, error);
      alert(`Failed to reset module progress. Please try again.`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all learning progress? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      clearAllData();
      setTimeout(() => {
        window.location.reload(); // Reload to reset state
      }, 500);
    } catch (error) {
      logger.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
      setIsClearing(false);
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        wordProgress: persistenceUtils.getStorageInfo(),
        exportDate: new Date().toISOString(),
        version: '2.0.0',
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `levelup-progress-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const isStorageAvailable = isLocalStorageAvailable();
  const wordsWithProgress = Object.keys(wordProgress).length;
  const totalStorageKB = Math.round((storageInfo.size / 1024) * 100) / 100;

  if (compact) {
    return (
      <Container>
        <Status available={isStorageAvailable}>
          {isStorageAvailable
            ? 'Progress saved automatically'
            : 'Progress not saved - localStorage unavailable'}
        </Status>
        {isStorageAvailable && (
          <div>
            <WordCount>{wordsWithProgress}</WordCount> words tracked •
            <WordCount>{totalStorageKB}KB</WordCount> used
          </div>
        )}
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        💾 Storage Management
        <Button variant="secondary" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </Title>

      <Status available={isStorageAvailable}>
        {isStorageAvailable
          ? 'Local storage is available - your progress is being saved automatically'
          : 'Local storage is not available - progress will not be saved between sessions'}
      </Status>

      {isStorageAvailable && showDetails && (
        <>
          <StorageInfo>
            <InfoCard>
              <InfoLabel>Words Tracked</InfoLabel>
              <InfoValue>{wordsWithProgress}</InfoValue>
            </InfoCard>
            <InfoCard>
              <InfoLabel>Storage Used</InfoLabel>
              <InfoValue>{totalStorageKB} KB</InfoValue>
            </InfoCard>
            <InfoCard>
              <InfoLabel>Current Language</InfoLabel>
              <InfoValue>{language || 'None'}</InfoValue>
            </InfoCard>
            <InfoCard>
              <InfoLabel>Session Active</InfoLabel>
              <InfoValue>{isSessionActive ? 'Yes' : 'No'}</InfoValue>
            </InfoCard>
          </StorageInfo>

          <ButtonGroup>
            <Button onClick={updateStorageInfo}>Refresh Info</Button>
            <Button variant="secondary" onClick={handleExportData}>
              Export Progress
            </Button>
            <Button variant="danger" onClick={handleClearAll} disabled={isClearing}>
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </ButtonGroup>

          <LanguageSection>
            <Title>🌍 Language Data Management</Title>
            <LanguageGrid>
              {getAvailableLanguages().map(({ code, info }) => {
                const languageProgress = wordProgressStorage.load(code);
                const modules = getModulesForLanguage(code);
                const totalWords = modules.reduce(
                  (sum, module) => sum + (module.words?.length || 0),
                  0
                );
                const practicedWords = Object.keys(languageProgress).filter(wordId => {
                  const progress = languageProgress[wordId];
                  return progress && progress.xp > 0;
                }).length;
                const totalXP = Object.values(languageProgress).reduce(
                  (sum, prog) => sum + (prog?.xp || 0),
                  0
                );

                return (
                  <LanguageCard key={code}>
                    <LanguageHeader>
                      <span className="flag">{info.flag}</span>
                      <span className="name">{info.name}</span>
                    </LanguageHeader>

                    <LanguageStats>
                      <div className="stat">
                        <span className="value">{totalXP.toLocaleString()}</span> XP
                      </div>
                      <div className="stat">
                        <span className="value">{practicedWords}</span>/
                        <span className="value">{totalWords}</span> words
                      </div>
                      <div className="stat">
                        <span className="value">{modules.length}</span> modules
                      </div>
                    </LanguageStats>

                    <ResetButtons>
                      <SmallButton
                        variant="danger"
                        onClick={() => handleResetLanguage(code, info.name)}
                        disabled={totalXP === 0}
                      >
                        🗑️ Reset All {info.name}
                      </SmallButton>

                      {modules.map(module => {
                        const moduleWords = module.words || [];
                        const moduleProgress = moduleWords.filter(
                          word => languageProgress[word.id] && languageProgress[word.id].xp > 0
                        ).length;

                        return moduleProgress > 0 ? (
                          <SmallButton
                            key={module.id}
                            variant="secondary"
                            onClick={() =>
                              handleResetModule(code, module.id, info.name, module.name)
                            }
                          >
                            Reset {module.name}
                          </SmallButton>
                        ) : null;
                      })}
                    </ResetButtons>

                    {totalXP === 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '0.8rem',
                          color: 'rgba(255,255,255,0.6)',
                          fontStyle: 'italic',
                        }}
                      >
                        No progress to reset
                      </div>
                    )}
                  </LanguageCard>
                );
              })}
            </LanguageGrid>
          </LanguageSection>

          <ProgressDisplay>
            {language && wordProgress && (
              <>
                Progress is automatically saved as you learn. Your mastery levels, session progress,
                and learning statistics are preserved between browser sessions.
                {isSessionActive && (
                  <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                    ⚠️ Active session will be restored if you refresh the page.
                  </div>
                )}
              </>
            )}
          </ProgressDisplay>
        </>
      )}
    </Container>
  );
};
