/**
 * AI Intervention Modal
 * Real-time AI learning guidance and intervention suggestions
 */

import React from 'react';
import styled from '@emotion/styled';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${props => props.theme.spacing.lg};
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.95) 0%, rgba(80, 200, 120, 0.95) 100%);
  border-radius: 20px;
  padding: ${props => props.theme.spacing.xl};
  max-width: 500px;
  width: 100%;
  color: white;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateY(50px) scale(0.9);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`;

const AIAvatar = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #4a90e2, #50c878);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto ${props => props.theme.spacing.md} auto;
  border: 3px solid rgba(255, 255, 255, 0.3);
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const ModalTitle = styled.h2`
  text-align: center;
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  font-size: 1.4rem;
  font-weight: 600;
`;

const InterventionMessage = styled.div`
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  border-left: 4px solid rgba(255, 255, 255, 0.5);
`;

const MessageTitle = styled.h3`
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const MessageDescription = styled.p`
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  line-height: 1.5;
  opacity: 0.9;
`;

const RecommendationsList = styled.ul`
  margin: 0;
  padding-left: ${props => props.theme.spacing.md};

  li {
    margin-bottom: ${props => props.theme.spacing.xs};
    opacity: 0.9;
  }
`;

const UrgencyIndicator = styled.div<{ urgency: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${props => props.theme.spacing.sm};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
      switch (props.urgency) {
        case 'critical':
          return '#ff4444';
        case 'high':
          return '#ff9800';
        case 'medium':
          return '#2196f3';
        default:
          return '#4caf50';
      }
    }};
    animation: ${props => (props.urgency === 'critical' ? 'blink 1s infinite' : 'none')};
  }

  @keyframes blink {
    0%,
    50% {
      opacity: 1;
    }
    51%,
    100% {
      opacity: 0.3;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  justify-content: center;
  margin-top: ${props => props.theme.spacing.lg};
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' | 'dismiss' }>`
  background: ${props => {
    switch (props.variant) {
      case 'primary':
        return 'rgba(255, 255, 255, 0.9)';
      case 'secondary':
        return 'rgba(255, 255, 255, 0.2)';
      case 'dismiss':
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => (props.variant === 'primary' ? '#2c3e50' : 'white')};
  border: ${props => (props.variant === 'primary' ? 'none' : '1px solid rgba(255, 255, 255, 0.3)')};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;

  &:hover {
    transform: translateY(-2px);
    background: ${props => {
      switch (props.variant) {
        case 'primary':
          return 'white';
        case 'secondary':
          return 'rgba(255, 255, 255, 0.3)';
        case 'dismiss':
          return 'rgba(255, 255, 255, 0.2)';
      }
    }};
  }

  &:active {
    transform: translateY(0);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${props => props.theme.spacing.md};
  right: ${props => props.theme.spacing.md};
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.2rem;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

const BehavioralContext = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.sm};
  font-size: 0.8rem;
  opacity: 0.8;
`;

interface AIInterventionModalProps {
  isOpen: boolean;
  intervention: {
    type: string;
    priority: string;
    urgency: string;
    action: string;
    value: any;
    reasoning: string[];
    confidence: number;
    behavioralContext?: string[];
    implementation?: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
    expectedOutcome?: {
      performanceImprovement: number;
      engagementBoost: number;
      retentionIncrease: number;
    };
  };
  onAccept: () => void;
  onDefer: () => void;
  onDismiss: () => void;
  onClose: () => void;
}

export const AIInterventionModal: React.FC<AIInterventionModalProps> = ({
  isOpen,
  intervention,
  onAccept,
  onDefer,
  onDismiss,
  onClose,
}) => {
  if (!intervention) return null;

  const getUrgencyMessage = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'Immediate attention needed';
      case 'high':
        return 'Important recommendation';
      case 'medium':
        return 'Helpful suggestion';
      default:
        return 'Optional tip';
    }
  };

  const getActionMessage = (action: string) => {
    switch (action) {
      case 'immediate_break':
        return 'Take a break to refresh your mind';
      case 'adjust_difficulty':
        return 'Let me adjust the difficulty level';
      case 'suggest_session_end':
        return 'Consider ending on a positive note';
      case 'focus_content':
        return 'Focus on specific content areas';
      default:
        return 'AI recommendation available';
    }
  };

  return (
    <>
      {isOpen && (
        <ModalOverlay onClick={onClose}>
          <ModalContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <CloseButton onClick={onClose}>×</CloseButton>

            <AIAvatar>🧠</AIAvatar>

            <ModalTitle>AI Learning Coach</ModalTitle>

            <UrgencyIndicator urgency={intervention.urgency}>
              {getUrgencyMessage(intervention.urgency)}
            </UrgencyIndicator>

            <InterventionMessage>
              <MessageTitle>{getActionMessage(intervention.action)}</MessageTitle>

              <MessageDescription>
                {intervention.reasoning[0] ||
                  'Based on your current learning patterns, I have a suggestion that could help improve your learning experience.'}
              </MessageDescription>

              {intervention.reasoning.length > 1 && (
                <RecommendationsList>
                  {intervention.reasoning.slice(1).map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </RecommendationsList>
              )}

              {intervention.implementation && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Immediate steps:</strong>
                  <RecommendationsList>
                    {intervention.implementation.immediate.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </RecommendationsList>
                </div>
              )}

              {intervention.expectedOutcome && (
                <div style={{ marginTop: '12px', fontSize: '0.9rem', opacity: 0.8 }}>
                  <strong>Expected benefits:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {intervention.expectedOutcome.performanceImprovement > 0 && (
                      <li>
                        +{(intervention.expectedOutcome.performanceImprovement * 100).toFixed(0)}%
                        performance
                      </li>
                    )}
                    {intervention.expectedOutcome.engagementBoost > 0 && (
                      <li>
                        +{(intervention.expectedOutcome.engagementBoost * 100).toFixed(0)}%
                        engagement
                      </li>
                    )}
                    {intervention.expectedOutcome.retentionIncrease > 0 && (
                      <li>
                        +{(intervention.expectedOutcome.retentionIncrease * 100).toFixed(0)}%
                        retention
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {intervention.behavioralContext && intervention.behavioralContext.length > 0 && (
                <BehavioralContext>
                  <strong>Why now:</strong> {intervention.behavioralContext.join(', ')}
                </BehavioralContext>
              )}
            </InterventionMessage>

            <ActionButtons>
              <ActionButton variant="primary" onClick={onAccept}>
                {intervention.urgency === 'critical' ? 'Apply Now' : 'Accept'}
              </ActionButton>

              {intervention.urgency !== 'critical' && (
                <ActionButton variant="secondary" onClick={onDefer}>
                  Remind Later
                </ActionButton>
              )}

              <ActionButton variant="dismiss" onClick={onDismiss}>
                Not Now
              </ActionButton>
            </ActionButtons>

            <div
              style={{
                textAlign: 'center',
                marginTop: '16px',
                fontSize: '0.8rem',
                opacity: 0.7,
              }}
            >
              Confidence: {(intervention.confidence * 100).toFixed(0)}% | Priority:{' '}
              {intervention.priority.charAt(0).toUpperCase() + intervention.priority.slice(1)}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};
