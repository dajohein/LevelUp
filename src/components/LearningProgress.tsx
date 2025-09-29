import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { words } from '../services/wordService';
import { calculateMasteryDecay } from '../services/masteryService';

// Animations
const progressGrow = keyframes`
  from { width: 0%; }
  to { width: var(--target-width); }
`;

const Container = styled.div<{ enhanced?: boolean }>`
  background: ${props => props.enhanced ? 
    'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)' :
    'rgba(255, 255, 255, 0.1)'
  };
  border: ${props => props.enhanced ? 
    '2px solid rgba(59, 130, 246, 0.2)' :
    'none'
  };
  border-radius: ${props => props.enhanced ? '16px' : '12px'};
  padding: ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.md} 0;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  ${props => props.enhanced && `
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transition: left 0.5s ease;
    }

    &:hover::before {
      left: 100%;
    }
  `}
`;

const Title = styled.h3<{ enhanced?: boolean }>`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-size: ${props => props.enhanced ? '1.3rem' : '1rem'};
  font-weight: ${props => props.enhanced ? '700' : '500'};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  ${props => props.enhanced && `
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  `}
`;

const ProgressBar = styled.div<{ enhanced?: boolean }>`
  background: ${props => props.enhanced ? 
    'linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.2))' :
    'rgba(0, 0, 0, 0.2)'
  };
  border-radius: ${props => props.enhanced ? '20px' : '8px'};
  height: ${props => props.enhanced ? '24px' : '20px'};
  overflow: hidden;
  margin: ${props => props.theme.spacing.xs} 0;
  position: relative;
  box-shadow: ${props => props.enhanced ? 
    'inset 0 2px 4px rgba(0, 0, 0, 0.2)' :
    'none'
  };

  ${props => props.enhanced && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
      border-radius: 20px 20px 0 0;
    }
  `}
`;

const ProgressSegment = styled.div<{ 
  width: number; 
  color: string; 
  enhanced?: boolean; 
  animate?: boolean;
  delay?: number;
}>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.enhanced ? 
    `linear-gradient(135deg, ${props.color}, ${props.color}cc)` :
    props.color
  };
  display: inline-block;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  
  ${props => props.animate && css`
    animation: ${progressGrow} ${1 + (props.delay || 0) * 0.2}s ease-out ${(props.delay || 0) * 0.1}s both;
    --target-width: ${props.width}%;
  `}

  ${props => props.enhanced && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      transform: translateX(-100%);
      animation: shimmer 3s infinite;
    }

    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
  `}
`;

const Legend = styled.div<{ enhanced?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.enhanced ? props.theme.spacing.md : props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.xs};
  justify-content: ${props => props.enhanced ? 'center' : 'flex-start'};
`;

const LegendItem = styled.div<{ color: string; enhanced?: boolean }>`
  display: flex;
  align-items: center;
  font-size: ${props => props.enhanced ? '0.9rem' : '0.8rem'};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.enhanced ? '6px 12px' : '4px 8px'};
  border-radius: ${props => props.enhanced ? '20px' : '4px'};
  background: ${props => props.enhanced ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};
  border: ${props => props.enhanced ? `1px solid ${props.color}40` : 'none'};
  transition: all 0.3s ease;

  &::before {
    content: '';
    width: ${props => props.enhanced ? '16px' : '12px'};
    height: ${props => props.enhanced ? '16px' : '12px'};
    background: ${props => props.enhanced ? 
      `linear-gradient(135deg, ${props.color}, ${props.color}cc)` :
      props.color
    };
    border-radius: ${props => props.enhanced ? '50%' : '2px'};
    margin-right: ${props => props.enhanced ? '8px' : '6px'};
    box-shadow: ${props => props.enhanced ? `0 0 8px ${props.color}40` : 'none'};
  }

  ${props => props.enhanced && `
    &:hover {
      transform: translateY(-1px);
      background: rgba(255, 255, 255, 0.1);
      border-color: ${props.color}80;
    }
  `}
`;

const Stats = styled.div<{ enhanced?: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${props => props.enhanced ? '100px' : '80px'}, 1fr));
  gap: ${props => props.enhanced ? props.theme.spacing.md : props.theme.spacing.xs};
  margin-top: ${props => props.theme.spacing.sm};
`;

const StatItem = styled.div<{ enhanced?: boolean }>`
  text-align: center;
  font-size: ${props => props.enhanced ? '0.9rem' : '0.8rem'};
  color: ${props => props.theme.colors.textSecondary};
  padding: ${props => props.enhanced ? '12px' : '8px'};
  border-radius: ${props => props.enhanced ? '12px' : '4px'};
  background: ${props => props.enhanced ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};
  border: ${props => props.enhanced ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'};
  transition: all 0.3s ease;

  ${props => props.enhanced && `
    &:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `}
`;

const StatValue = styled.div<{ enhanced?: boolean; color?: string }>`
  font-size: ${props => props.enhanced ? '1.5rem' : '1.2rem'};
  font-weight: bold;
  color: ${props => props.color || props.theme.colors.primary};
  margin-bottom: ${props => props.enhanced ? '6px' : '4px'};
  
  ${props => props.enhanced && `
    background: linear-gradient(135deg, ${props.color || '#3b82f6'}, ${props.color || '#3b82f6'}cc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  `}
`;

interface LearningProgressProps {
  compact?: boolean;
  enhanced?: boolean;
}

export const LearningProgress: React.FC<LearningProgressProps> = ({ 
  compact = false, 
  enhanced = false 
}) => {
  const { wordProgress, language } = useSelector((state: RootState) => state.game);
  const [animateProgress, setAnimateProgress] = useState(false);

  const languageWords = (language && words[language]?.words) || [];

  // Trigger animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateProgress(true), 100);
    return () => clearTimeout(timer);
  }, [language]); // Re-trigger when language changes

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
      <Container enhanced={enhanced}>
        <ProgressBar enhanced={enhanced}>
          <ProgressSegment 
            width={percentages.new} 
            color={colors.new} 
            enhanced={enhanced}
            animate={animateProgress}
            delay={0}
          />
          <ProgressSegment 
            width={percentages.struggling} 
            color={colors.struggling} 
            enhanced={enhanced}
            animate={animateProgress}
            delay={1}
          />
          <ProgressSegment 
            width={percentages.learning} 
            color={colors.learning} 
            enhanced={enhanced}
            animate={animateProgress}
            delay={2}
          />
          <ProgressSegment 
            width={percentages.learned} 
            color={colors.learned} 
            enhanced={enhanced}
            animate={animateProgress}
            delay={3}
          />
          <ProgressSegment 
            width={percentages.mastered} 
            color={colors.mastered} 
            enhanced={enhanced}
            animate={animateProgress}
            delay={4}
          />
        </ProgressBar>
      </Container>
    );
  }

  return (
    <Container enhanced={enhanced}>
      <Title enhanced={enhanced}>
        {enhanced ? '🎯 Learning Progress' : 'Learning Progress'}
      </Title>
      <ProgressBar enhanced={enhanced}>
        <ProgressSegment 
          width={percentages.new} 
          color={colors.new} 
          enhanced={enhanced}
          animate={animateProgress}
          delay={0}
        />
        <ProgressSegment 
          width={percentages.struggling} 
          color={colors.struggling} 
          enhanced={enhanced}
          animate={animateProgress}
          delay={1}
        />
        <ProgressSegment 
          width={percentages.learning} 
          color={colors.learning} 
          enhanced={enhanced}
          animate={animateProgress}
          delay={2}
        />
        <ProgressSegment 
          width={percentages.learned} 
          color={colors.learned} 
          enhanced={enhanced}
          animate={animateProgress}
          delay={3}
        />
        <ProgressSegment 
          width={percentages.mastered} 
          color={colors.mastered} 
          enhanced={enhanced}
          animate={animateProgress}
          delay={4}
        />
      </ProgressBar>

      <Legend enhanced={enhanced}>
        <LegendItem color={colors.new} enhanced={enhanced}>
          New ({masteryDistribution.new})
        </LegendItem>
        <LegendItem color={colors.struggling} enhanced={enhanced}>
          Struggling ({masteryDistribution.struggling})
        </LegendItem>
        <LegendItem color={colors.learning} enhanced={enhanced}>
          Learning ({masteryDistribution.learning})
        </LegendItem>
        <LegendItem color={colors.learned} enhanced={enhanced}>
          Learned ({masteryDistribution.learned})
        </LegendItem>
        <LegendItem color={colors.mastered} enhanced={enhanced}>
          Mastered ({masteryDistribution.mastered})
        </LegendItem>
      </Legend>

      <Stats enhanced={enhanced}>
        <StatItem enhanced={enhanced}>
          <StatValue enhanced={enhanced} color="#10b981">
            {Math.round(percentages.mastered)}%
          </StatValue>
          <div>Mastered</div>
        </StatItem>
        <StatItem enhanced={enhanced}>
          <StatValue enhanced={enhanced} color="#3b82f6">
            {Math.round(percentages.learned + percentages.mastered)}%
          </StatValue>
          <div>Learned+</div>
        </StatItem>
        <StatItem enhanced={enhanced}>
          <StatValue enhanced={enhanced} color="#f59e0b">
            {masteryDistribution.struggling + masteryDistribution.learning}
          </StatValue>
          <div>Active</div>
        </StatItem>
        <StatItem enhanced={enhanced}>
          <StatValue enhanced={enhanced} color="#6b7280">
            {masteryDistribution.new}
          </StatValue>
          <div>New</div>
        </StatItem>
      </Stats>
    </Container>
  );
};
