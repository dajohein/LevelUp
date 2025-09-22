import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { persistenceUtils } from '../store/persistenceMiddleware';
import { isLocalStorageAvailable, getStorageInfo, clearAllData } from '../services/storageService';

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
      console.error('Failed to clear data:', error);
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
      console.error('Failed to export data:', error);
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
