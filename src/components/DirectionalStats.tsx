import React from 'react';
import styled from '@emotion/styled';
import { FaArrowRight, FaArrowLeft, FaBalanceScale } from 'react-icons/fa';
import { DirectionalAnalyticsService } from '../services/dataMigrationService';
import { getDirectionalLearningStatus } from '../utils/directionalLearningUtils';

const DirectionalStatsContainer = styled.div`
  margin-top: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(255, 255, 255, 0.02);
  border-radius: ${props => props.theme.borderRadius.sm};
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const DirectionalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  margin-bottom: ${props => props.theme.spacing.sm};
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DirectionalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const DirectionCard = styled.div<{ isWeak?: boolean }>`
  padding: ${props => props.theme.spacing.sm};
  background: ${props => props.isWeak 
    ? 'rgba(255, 152, 0, 0.1)' 
    : 'rgba(76, 175, 80, 0.1)'};
  border: 1px solid ${props => props.isWeak 
    ? 'rgba(255, 152, 0, 0.2)' 
    : 'rgba(76, 175, 80, 0.2)'};
  border-radius: ${props => props.theme.borderRadius.sm};
  text-align: center;
`;

const DirectionLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const DirectionValue = styled.div<{ isWeak?: boolean }>`
  font-size: 1.1rem;
  font-weight: bold;
  color: ${props => props.isWeak 
    ? '#ff9800' 
    : props.theme.colors.success};
`;

const BalanceIndicator = styled.div<{ balance: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.xs};
  font-size: 0.7rem;
  color: ${props => {
    const abs = Math.abs(props.balance);
    if (abs < 20) return props.theme.colors.success;
    if (abs < 40) return '#ff9800';
    return '#f44336';
  }};
`;

const RecommendationText = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
  margin-top: ${props => props.theme.spacing.xs};
  font-style: italic;
`;

interface DirectionalStatsProps {
  languageCode: string;
}

export const DirectionalStats: React.FC<DirectionalStatsProps> = ({ languageCode }) => {
  const directionalStatus = getDirectionalLearningStatus(languageCode);
  
  // Don't show if directional learning isn't supported or meaningful for this language
  if (!directionalStatus.shouldShowAnalytics) {
    return null;
  }

  const analytics = DirectionalAnalyticsService.calculateLanguageDirectionalAnalytics(languageCode);

  const getBalanceText = (balance: number) => {
    const abs = Math.abs(balance);
    if (abs < 10) return 'Perfectly Balanced';
    if (abs < 20) return 'Well Balanced';
    if (abs < 30) return 'Slightly Unbalanced';
    if (abs < 50) return 'Unbalanced';
    return 'Heavily Unbalanced';
  };

  const getRecommendation = (analyticsData: ReturnType<typeof DirectionalAnalyticsService.calculateLanguageDirectionalAnalytics>) => {
    if (analyticsData.wordsNeedingBalance.length === 0) {
      return 'Great balance! Keep practicing both directions.';
    }
    
    const weakDirection = analyticsData.averageTermToDefMastery < analyticsData.averageDefToTermMastery 
      ? 'term→definition' : 'definition→term';
      
    if (analyticsData.wordsNeedingBalance.length < 3) {
      return `Focus on ${weakDirection} for a few words.`;
    }
    
    return `Practice more ${weakDirection} direction.`;
  };

  return (
    <DirectionalStatsContainer>
      <DirectionalHeader>
        <FaBalanceScale />
        Directional Learning
      </DirectionalHeader>
      
      <DirectionalGrid>
        <DirectionCard isWeak={analytics.averageTermToDefMastery < analytics.averageDefToTermMastery}>
          <DirectionLabel>
            <FaArrowRight size={8} />
            Term → Definition
          </DirectionLabel>
          <DirectionValue isWeak={analytics.averageTermToDefMastery < analytics.averageDefToTermMastery}>
            {analytics.averageTermToDefMastery}%
          </DirectionValue>
        </DirectionCard>
        
        <DirectionCard isWeak={analytics.averageDefToTermMastery < analytics.averageTermToDefMastery}>
          <DirectionLabel>
            <FaArrowLeft size={8} />
            Definition → Term
          </DirectionLabel>
          <DirectionValue isWeak={analytics.averageDefToTermMastery < analytics.averageTermToDefMastery}>
            {analytics.averageDefToTermMastery}%
          </DirectionValue>
        </DirectionCard>
      </DirectionalGrid>
      
      <BalanceIndicator balance={analytics.overallBalance}>
        <FaBalanceScale size={10} />
        {getBalanceText(analytics.overallBalance)}
      </BalanceIndicator>
      
      <RecommendationText>
        {getRecommendation(analytics)}
      </RecommendationText>
    </DirectionalStatsContainer>
  );
};

export default DirectionalStats;