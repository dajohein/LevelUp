/**
 * Learning Profile Display Component
 *
 * Shows AI Learning Coach insights within UserProfile component
 * USER-SPECIFIC (not language-specific) learning patterns
 */

import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import type { UserLearningProfile } from '../services/storage/userLearningProfile';

interface LearningProfileDisplayProps {
  profile: UserLearningProfile;
  compact?: boolean;
}

// Animations
const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(147, 51, 234, 0.3); }
  50% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.6); }
`;

// Styled Components
const ProfileSection = styled.div<{ compact?: boolean }>`
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  border: 1px solid rgba(147, 51, 234, 0.2);
  border-radius: 12px;
  padding: ${props => (props.compact ? '12px' : '16px')};
  margin-top: 16px;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.1), transparent);
    animation: ${shimmer} 3s infinite;
  }
`;

const SectionTitle = styled.h4`
  color: #9333ea;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  &:before {
    content: '🧠';
    font-size: 16px;
  }
`;

const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

const InsightCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(147, 51, 234, 0.2);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    animation: ${pulseGlow} 2s infinite;
    transform: translateY(-1px);
  }
`;

const InsightLabel = styled.div`
  font-size: 10px;
  color: #9333ea;
  font-weight: 500;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InsightValue = styled.div`
  font-size: 12px;
  color: #e5e7eb;
  font-weight: 600;
`;

const ConfidenceBar = styled.div<{ confidence: number }>`
  width: 100%;
  height: 4px;
  background: rgba(147, 51, 234, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;

  &:after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.confidence * 100}%;
    background: linear-gradient(90deg, #9333ea, #3b82f6);
    border-radius: 2px;
    transition: width 0.5s ease;
  }
`;

const ConfidenceLabel = styled.div`
  font-size: 10px;
  color: #9ca3af;
  text-align: center;
  margin-top: 4px;
`;

export const LearningProfileDisplay: React.FC<LearningProfileDisplayProps> = ({
  profile,
  compact = false,
}) => {
  // Safety check - ensure profile has required properties
  if (
    !profile ||
    !profile.personality ||
    !profile.momentum ||
    !profile.cognitiveLoad ||
    !profile.motivation
  ) {
    console.warn('LearningProfileDisplay: Invalid profile data structure', {
      profile,
      expected: ['personality', 'momentum', 'cognitiveLoad', 'motivation'],
      received: profile ? Object.keys(profile) : 'null',
    });
    return (
      <ProfileSection compact={compact}>
        <SectionTitle>AI Learning Insights</SectionTitle>
        <div style={{ textAlign: 'center', color: '#ef4444', padding: '16px' }}>
          ⚠️ Profile data is incomplete. Please recreate your learning profile.
          <br />
          <button
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#9333ea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
            onClick={async () => {
              console.log('Clearing incomplete profile and recreating...');
              const { UserLearningProfileStorage } =
                await import('../services/storage/userLearningProfile');
              const storage = new UserLearningProfileStorage();
              try {
                await storage.deleteProfile(profile?.userId || 'default-user');
                console.log('Incomplete profile cleared');
                // Reload the page to trigger profile recreation
                window.location.reload();
              } catch (error) {
                console.error('Error clearing profile:', error);
              }
            }}
          >
            🔄 Clear & Recreate Profile
          </button>
        </div>
      </ProfileSection>
    );
  }

  // Helper functions
  const formatLearningStyle = (style: string): string => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const formatProcessingSpeed = (speed: string): string => {
    const speedMap = {
      fast: 'Quick',
      moderate: 'Steady',
      deliberate: 'Careful',
    };
    return speedMap[speed as keyof typeof speedMap] || speed;
  };

  const getMotivationEmoji = (level: number): string => {
    if (level >= 80) return '🔥';
    if (level >= 60) return '⚡';
    if (level >= 40) return '💪';
    return '🌱';
  };

  const getCognitiveLoadColor = (level: string): string => {
    if (level === 'overloaded') return '#ef4444'; // Red - high load
    if (level === 'high') return '#f59e0b'; // Amber - moderate load
    if (level === 'optimal') return '#10b981'; // Green - optimal load
    return '#6b7280'; // Gray - low load
  };

  return (
    <ProfileSection compact={compact}>
      <SectionTitle>AI Learning Insights</SectionTitle>

      <InsightGrid>
        <InsightCard>
          <InsightLabel>Learning Style</InsightLabel>
          <InsightValue>
            {formatLearningStyle(profile.personality?.learningStyle || 'multimodal')}
          </InsightValue>
        </InsightCard>

        <InsightCard>
          <InsightLabel>Processing</InsightLabel>
          <InsightValue>
            {formatProcessingSpeed(profile.personality?.processingSpeed || 'moderate')}
          </InsightValue>
        </InsightCard>

        <InsightCard>
          <InsightLabel>Motivation</InsightLabel>
          <InsightValue>
            {getMotivationEmoji((profile.motivation?.currentLevel || 0.7) * 100)}{' '}
            {Math.round((profile.motivation?.currentLevel || 0.7) * 100)}%
          </InsightValue>
        </InsightCard>

        <InsightCard>
          <InsightLabel>Cognitive Load</InsightLabel>
          <InsightValue
            style={{ color: getCognitiveLoadColor(profile.cognitiveLoad?.level || 'optimal') }}
          >
            {profile.cognitiveLoad?.level || 'optimal'}
          </InsightValue>
        </InsightCard>
      </InsightGrid>

      <ConfidenceBar confidence={profile.metadata?.confidenceScore || 0.3} />
      <ConfidenceLabel>
        Profile Confidence: {Math.round((profile.metadata?.confidenceScore || 0.3) * 100)}%
      </ConfidenceLabel>
    </ProfileSection>
  );
};
