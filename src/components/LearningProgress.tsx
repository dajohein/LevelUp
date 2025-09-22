import React from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { words } from '../services/wordService';
import { calculateMasteryDecay } from '../services/masteryService';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.md} 0;
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-size: 1rem;
`;

const ProgressBar = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  height: 20px;
  overflow: hidden;
  margin: ${props => props.theme.spacing.xs} 0;
`;

const ProgressSegment = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color};
  display: inline-block;
  transition: width 0.3s ease;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.xs};
`;

const LegendItem = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text};

  &::before {
    content: '';
    width: 12px;
    height: 12px;
    background: ${props => props.color};
    border-radius: 2px;
    margin-right: 6px;
  }
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: ${props => props.theme.spacing.xs};
  margin-top: ${props => props.theme.spacing.sm};
`;

const StatItem = styled.div`
  text-align: center;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

interface LearningProgressProps {
  compact?: boolean;
}

export const LearningProgress: React.FC<LearningProgressProps> = ({ compact = false }) => {
  const { wordProgress, language } = useSelector((state: RootState) => state.game);

  const languageWords = (language && words[language]?.words) || [];

  // Calculate mastery distribution
  const masteryDistribution = {
    new: 0, // 0%
    struggling: 0, // 1-49%
    learning: 0, // 50-69%
    learned: 0, // 70-89%
    mastered: 0, // 90-100%
  };

  languageWords.forEach((word: any) => {
    const progress = wordProgress[word.id];
    let currentMastery = 0;

    if (progress) {
      currentMastery = calculateMasteryDecay(progress.lastPracticed, progress.xp);
    }

    if (currentMastery === 0) {
      masteryDistribution.new++;
    } else if (currentMastery < 50) {
      masteryDistribution.struggling++;
    } else if (currentMastery < 70) {
      masteryDistribution.learning++;
    } else if (currentMastery < 90) {
      masteryDistribution.learned++;
    } else {
      masteryDistribution.mastered++;
    }
  });

  const total = languageWords.length;
  const percentages = {
    new: (masteryDistribution.new / total) * 100,
    struggling: (masteryDistribution.struggling / total) * 100,
    learning: (masteryDistribution.learning / total) * 100,
    learned: (masteryDistribution.learned / total) * 100,
    mastered: (masteryDistribution.mastered / total) * 100,
  };

  const colors = {
    new: '#6b7280', // Gray
    struggling: '#ef4444', // Red
    learning: '#f59e0b', // Orange
    learned: '#3b82f6', // Blue
    mastered: '#10b981', // Green
  };

  if (compact) {
    return (
      <Container>
        <ProgressBar>
          <ProgressSegment width={percentages.new} color={colors.new} />
          <ProgressSegment width={percentages.struggling} color={colors.struggling} />
          <ProgressSegment width={percentages.learning} color={colors.learning} />
          <ProgressSegment width={percentages.learned} color={colors.learned} />
          <ProgressSegment width={percentages.mastered} color={colors.mastered} />
        </ProgressBar>
      </Container>
    );
  }

  return (
    <Container>
      <Title>Learning Progress</Title>
      <ProgressBar>
        <ProgressSegment width={percentages.new} color={colors.new} />
        <ProgressSegment width={percentages.struggling} color={colors.struggling} />
        <ProgressSegment width={percentages.learning} color={colors.learning} />
        <ProgressSegment width={percentages.learned} color={colors.learned} />
        <ProgressSegment width={percentages.mastered} color={colors.mastered} />
      </ProgressBar>

      <Legend>
        <LegendItem color={colors.new}>New ({masteryDistribution.new})</LegendItem>
        <LegendItem color={colors.struggling}>
          Struggling ({masteryDistribution.struggling})
        </LegendItem>
        <LegendItem color={colors.learning}>Learning ({masteryDistribution.learning})</LegendItem>
        <LegendItem color={colors.learned}>Learned ({masteryDistribution.learned})</LegendItem>
        <LegendItem color={colors.mastered}>Mastered ({masteryDistribution.mastered})</LegendItem>
      </Legend>

      <Stats>
        <StatItem>
          <StatValue>{Math.round(percentages.mastered)}%</StatValue>
          <div>Mastered</div>
        </StatItem>
        <StatItem>
          <StatValue>{Math.round(percentages.learned + percentages.mastered)}%</StatValue>
          <div>Learned+</div>
        </StatItem>
        <StatItem>
          <StatValue>{masteryDistribution.struggling + masteryDistribution.learning}</StatValue>
          <div>Active</div>
        </StatItem>
        <StatItem>
          <StatValue>{masteryDistribution.new}</StatValue>
          <div>New</div>
        </StatItem>
      </Stats>
    </Container>
  );
};
