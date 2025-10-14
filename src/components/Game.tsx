import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { nextWord, setCurrentWord, setLanguage, setCurrentModule } from '../store/gameSlice';
import {
  addTimeElapsed,
  completeSession,
  incrementWordsCompleted,
  addCorrectAnswer,
  addIncorrectAnswer,
  addPerfectAccuracyBonus,
  setLanguage as setSessionLanguage,
} from '../store/sessionSlice';
import { useAudio } from '../features/audio/AudioContext';
import { words, getWordsForLanguage } from '../services/wordService';
import { calculateMasteryDecay } from '../services/masteryService';
import { useEnhancedGame } from '../hooks/useEnhancedGame';
import { challengeServiceManager } from '../services/challengeServiceManager';
import { UnifiedLoading } from './feedback/UnifiedLoading';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { AchievementManager } from './AchievementManager';
import { MultipleChoiceQuiz } from './quiz/MultipleChoiceQuiz';
import { OpenQuestionQuiz } from './quiz/OpenQuestionQuiz';
import { LetterScrambleQuiz } from './quiz/LetterScrambleQuiz';
import { FillInTheBlankQuiz } from './quiz/FillInTheBlankQuiz';
import { LearningCard } from './quiz/LearningCard';
import { Navigation } from './Navigation';
import { LearningProgress } from './LearningProgress';
import { StorageManagement } from './StorageManagement';
import { LevelUpNotification } from './animations/LevelUpNotification';
import { useLevelUpDetection } from '../hooks/useLevelUpDetection';
import { keyframes, css } from '@emotion/react';

// Session Progress Animations
const countUp = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
`;

const streakFire = keyframes`
  0%, 100% { transform: scale(1) rotate(-1deg); }
  50% { transform: scale(1.1) rotate(1deg); }
`;

const livesWarning = keyframes`
  0%, 100% { 
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
    border-color: rgba(239, 68, 68, 0.7);
  }
  50% { 
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.8);
    border-color: rgba(239, 68, 68, 1);
  }
`;

const progressShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 120px); /* Full height minus fixed headers */
  min-height: calc(100dvh - 120px); /* Dynamic viewport height for mobile */
  padding: ${props => props.theme.spacing.xl};
  padding-top: calc(
    120px + ${props => props.theme.spacing.lg}
  ); /* Account for Navigation (60px) + Progress (~60px) */
  padding-bottom: ${props => props.theme.spacing.xl};
  background-color: ${props => props.theme.colors.background};
  overflow-y: auto; /* Make content scrollable */
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative; /* For floating directional hint */

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
    padding-top: calc(100px + ${props => props.theme.spacing.md});
    padding-bottom: ${props => props.theme.spacing.lg};
    min-height: calc(100dvh - 100px);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    padding-top: calc(90px + ${props => props.theme.spacing.sm});
    padding-bottom: ${props => props.theme.spacing.md};
    min-height: calc(100dvh - 90px);
  }
`;

const GameContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: 800px;
  gap: ${props => props.theme.spacing.lg};
  min-height: 300px; /* Reduced minimum height for smaller screens */

  @media (max-height: 600px) {
    min-height: 200px;
    gap: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.md};
    min-height: 250px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.sm};
    min-height: 200px;
    padding: 0 ${props => props.theme.spacing.xs};
  }

  @media (max-height: 500px) {
    min-height: 150px;
    gap: ${props => props.theme.spacing.xs};
  }
`;

const SkipButtonContainer = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md} 0;
  flex-shrink: 0; /* Ensure skip button is always visible */

  @media (max-height: 600px) {
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm} 0;
  }
`;

const SessionProgressBar = styled.div`
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 50%,
    rgba(236, 72, 153, 0.1) 100%
  );
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    ${css`
      animation: ${progressShimmer} 3s infinite;
    `}
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.xs};
    border-radius: 8px;
    border-width: 1px;
    flex-direction: row !important;
    justify-content: space-around;
    gap: ${props => props.theme.spacing.xs};
    min-height: auto;

    &:hover {
      transform: none;
    }

    &::before {
      display: none;
    }
  }
`;

const ProgressItem = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  text-align: center;
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
  min-width: 80px;

  ${props =>
    props.variant === 'score' &&
    css`
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
      border-color: rgba(16, 185, 129, 0.3);
      animation: ${pulseGlow} 2s infinite;
    `}

  ${props =>
    props.variant === 'streak' &&
    css`
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
      border-color: rgba(245, 158, 11, 0.3);
      animation: ${streakFire} 1s ease-in-out infinite;
    `}

  ${props =>
    props.variant === 'words' &&
    `
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
    border-color: rgba(59, 130, 246, 0.3);
  `}

  ${props =>
    props.variant === 'time' &&
    `
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
    border-color: rgba(139, 92, 246, 0.3);
  `}

  ${props =>
    props.variant === 'lives' &&
    css`
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
      border-color: rgba(239, 68, 68, 0.3);
      animation: ${livesWarning} 2s ease-in-out infinite;
    `}

  &:hover {
    transform: translateY(-2px) scale(1.05);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 45px;
    padding: ${props => props.theme.spacing.xs} 2px;
    border-radius: 6px;
    flex: 1;
    border-width: 1px;
    background: rgba(255, 255, 255, 0.03);

    &:hover {
      transform: none;
      background: rgba(255, 255, 255, 0.05);
    }
  }

  @media (max-width: 768px) {
    min-width: 60px;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  }
`;

const ProgressValue = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${css`
    animation: ${countUp} 0.5s ease-out;
  `}

  ${props =>
    props.variant === 'score' &&
    `
    color: #10b981;
    text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  `}

  ${props =>
    props.variant === 'streak' &&
    `
    color: #f59e0b;
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  `}

  ${props =>
    props.variant === 'words' &&
    `
    color: #3b82f6;
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  `}

  ${props =>
    props.variant === 'time' &&
    `
    color: #8b5cf6;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  `}

  ${props =>
    props.variant === 'lives' &&
    `
    color: #ef4444;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  `}

  &::before {
    content: ${props => {
      switch (props.variant) {
        case 'score':
          return "'🏆'";
        case 'streak':
          return "'🔥'";
        case 'words':
          return "'📝'";
        case 'time':
          return "'⏱️'";
        case 'lives':
          return "'❤️'";
        default:
          return "''";
      }
    }};
    font-size: 1rem;
    margin-right: 4px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    margin-bottom: 1px;
    gap: 1px;

    &::before {
      font-size: 0.6rem;
      margin-right: 1px;
    }
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;

    &::before {
      font-size: 0.8rem;
    }
  }
`;

const ProgressLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.6rem;
    letter-spacing: 0.2px;
    margin-top: 1px;
  }
`;
const Button = styled.button<{ disabled?: boolean }>`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  background-color: ${props =>
    props.disabled ? props.theme.colors.textSecondary : props.theme.colors.primary};
  color: white;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props =>
      props.disabled ? props.theme.colors.textSecondary : props.theme.colors.secondary};
  }
`;

const BossIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  padding: ${props => props.theme.spacing.md};
  border-radius: 12px;
  font-weight: bold;
  font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
  animation: pulse 2s infinite;
  margin-bottom: ${props => props.theme.spacing.lg};

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

// Mode-specific themed containers
const QuickDashContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #00d4aa;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(0, 212, 170, 0.1), transparent);
    animation: lightning 3s linear infinite;
  }

  @keyframes lightning {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
`;

const DeepDiveContainer = styled.div`
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: 2px solid #0099cc;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.2);

  &::after {
    content: '🧠';
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 2rem;
    opacity: 0.3;
  }
`;

const StreakChallengeContainer = styled.div<{ streak: number }>`
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  border: 2px solid #ff6b6b;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  animation: ${props => (props.streak > 5 ? 'fireGlow 1s ease-in-out infinite alternate' : 'none')};

  &::before {
    content: '🔥';
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 2rem;
    animation: ${props => (props.streak > 0 ? 'flameDance 2s ease-in-out infinite' : 'none')};
  }

  @keyframes fireGlow {
    0% {
      box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
    }
    100% {
      box-shadow: 0 0 40px rgba(255, 107, 107, 0.6);
    }
  }

  @keyframes flameDance {
    0%,
    100% {
      transform: rotate(-5deg) scale(1);
    }
    50% {
      transform: rotate(5deg) scale(1.1);
    }
  }
`;

const PrecisionModeContainer = styled.div`
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border: 2px solid #00b4db;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;

  &::before {
    content: '🎯';
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    font-size: 1.5rem;
    opacity: 0.4;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border: 2px solid #00b4db;
    border-radius: 50%;
    opacity: 0.3;
  }
`;

const FillInTheBlankContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #6c5ce7;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.2);

  &::before {
    content: '📝';
    position: absolute;
    top: 15px;
    right: 15px;
    font-size: 1.8rem;
    opacity: 0.4;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 15px;
    left: 15px;
    width: 40px;
    height: 4px;
    background: linear-gradient(90deg, transparent 0%, #a29bfe 50%, transparent 100%);
    border-radius: 2px;
    animation: contextGlow 2s ease-in-out infinite alternate;
  }

  @keyframes contextGlow {
    0% {
      opacity: 0.3;
      transform: scaleX(0.8);
    }
    100% {
      opacity: 0.7;
      transform: scaleX(1.2);
    }
  }
`;

const BossBattleContainer = styled.div<{ damage?: boolean }>`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%);
  border: 3px solid #8b0000;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  animation: ${props => (props.damage ? 'bossShake 0.5s ease-in-out' : 'none')};
  box-shadow: 0 0 30px rgba(139, 0, 0, 0.4), inset 0 0 50px rgba(0, 0, 0, 0.6);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(139, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0.4) 100%
    );
    pointer-events: none;
  }

  &::after {
    content: '⚔️';
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 2rem;
    animation: swordGlow 3s ease-in-out infinite;
    z-index: 1;
  }

  @keyframes bossShake {
    0%,
    100% {
      transform: translateX(0);
    }
    10% {
      transform: translateX(-5px) rotate(-0.5deg);
    }
    20% {
      transform: translateX(5px) rotate(0.5deg);
    }
    30% {
      transform: translateX(-3px) rotate(-0.3deg);
    }
    40% {
      transform: translateX(3px) rotate(0.3deg);
    }
    50% {
      transform: translateX(-2px);
    }
    60% {
      transform: translateX(2px);
    }
    70% {
      transform: translateX(-1px);
    }
    80% {
      transform: translateX(1px);
    }
    90% {
      transform: translateX(0);
    }
  }

  @keyframes swordGlow {
    0%,
    100% {
      filter: drop-shadow(0 0 5px #8b0000);
      transform: rotate(-10deg);
    }
    50% {
      filter: drop-shadow(0 0 20px #dc143c);
      transform: rotate(10deg);
    }
  }
`;

const SpeedMeter = styled.div<{ speed: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid #00d4aa;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '⚡';
    font-size: 1.2rem;
    animation: ${props => (props.speed > 80 ? 'electricPulse 0.5s infinite' : 'none')};
  }

  @keyframes electricPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
`;

const StreakMultiplier = styled.div<{ streak: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-weight: bold;
  font-size: 1.2rem;
  position: absolute;
  top: -10px;
  right: -10px;
  animation: ${props =>
    props.streak > 0 ? 'streakGlow 1s ease-in-out infinite alternate' : 'none'};
  transform: ${props => (props.streak > 5 ? 'scale(1.2)' : 'scale(1)')};
  transition: transform 0.3s ease;

  @keyframes streakGlow {
    0% {
      box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
    }
    100% {
      box-shadow: 0 0 25px rgba(255, 107, 107, 0.8);
    }
  }
`;

const AccuracyMeter = styled.div<{ accuracy: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(0, 180, 219, 0.1);
  border: 1px solid #00b4db;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '🎯';
    font-size: 1.2rem;
  }

  &::after {
    content: '${props => props.accuracy || 0}% Accuracy';
    font-weight: bold;
    color: ${props => (props.accuracy === 100 ? '#00b4db' : '#666')};
  }
`;

const BrainMeter = styled.div<{ knowledge: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(79, 172, 254, 0.1);
  border: 1px solid #4facfe;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '🧠';
    font-size: 1.2rem;
    animation: brainPulse 2s ease-in-out infinite;
  }

  &::after {
    content: 'Knowledge: ${props => props.knowledge}%';
    font-weight: bold;
    color: #4facfe;
  }

  @keyframes brainPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;

const ContextMeter = styled.div<{ contextualWords: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(108, 92, 231, 0.1);
  border: 1px solid #6c5ce7;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '📝';
    font-size: 1.2rem;
    animation: contextPulse 3s ease-in-out infinite;
  }

  &::after {
    content: 'Context: ${props => props.contextualWords} words';
    font-weight: bold;
    color: #6c5ce7;
  }

  @keyframes contextPulse {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
    }
    33% {
      transform: scale(1.05) rotate(1deg);
    }
    66% {
      transform: scale(1.02) rotate(-1deg);
    }
  }
`;

const BossAvatar = styled.div<{ health: number }>`
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #8b0000, #dc143c);
  border-radius: 50%;
  border: 4px solid #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.3);
  animation: ${props =>
    props.health < 30
      ? 'bossEnraged 1s ease-in-out infinite'
      : 'bossBreathing 3s ease-in-out infinite'};
  z-index: 2;

  &::before {
    content: '👹';
    filter: drop-shadow(0 0 10px #8b0000);
  }

  @keyframes bossBreathing {
    0%,
    100% {
      transform: translateY(-50%) scale(1);
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.3);
    }
    50% {
      transform: translateY(-50%) scale(1.05);
      box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), inset 0 0 30px rgba(0, 0, 0, 0.4);
    }
  }

  @keyframes bossEnraged {
    0%,
    100% {
      transform: translateY(-50%) scale(1);
      filter: hue-rotate(0deg);
    }
    50% {
      transform: translateY(-50%) scale(1.1);
      filter: hue-rotate(20deg);
    }
  }
`;

const BossNamePlate = styled.div`
  margin-left: 60px;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const BossName = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  margin-bottom: 4px;
`;

const BossTitle = styled.div`
  font-size: 0.9rem;
  color: #dc143c;
  font-style: italic;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
`;

const HealthBarContainer = styled.div`
  margin-left: 60px;
  position: relative;
`;

const HealthBarBackground = styled.div`
  width: 100%;
  height: 24px;
  background: linear-gradient(90deg, rgba(139, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
  border-radius: 12px;
  border: 2px solid #8b0000;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const HealthBarFill = styled.div<{ health: number }>`
  width: ${props => props.health}%;
  height: 100%;
  background: linear-gradient(90deg, #dc143c 0%, #ff4500 30%, #ffd700 70%, #32cd32 100%);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: healthShimmer 2s linear infinite;
  }

  @keyframes healthShimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(300%);
    }
  }
`;

const HealthText = styled.div<{ health: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  font-size: 0.9rem;
  color: ${props => (props.health > 30 ? '#FFFFFF' : '#FFD700')};
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  z-index: 1;
`;

const BossHealthBar = styled.div<{ health: number }>`
  position: relative;
  width: 100%;
  margin-bottom: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md};
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(139, 0, 0, 0.6));
  border-radius: 20px;
  border: 3px solid #8b0000;
  box-shadow: 0 0 20px rgba(139, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5);
`;

export const Game: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId?: string }>();

  // Optimize Redux selectors with memoization to prevent unnecessary re-renders
  const gameState = useSelector(
    (state: RootState) => ({
      currentWord: state.game.currentWord,
      currentOptions: state.game.currentOptions,
      quizMode: state.game.quizMode,
      wordProgress: state.game.wordProgress,
      capitalizationFeedback: state.game.capitalizationFeedback,
      language: state.game.language,
    }),
    (left, right) =>
      left.currentWord?.id === right.currentWord?.id &&
      left.quizMode === right.quizMode &&
      left.language === right.language &&
      Object.keys(left.wordProgress).length === Object.keys(right.wordProgress).length
  );

  const sessionState = useSelector(
    (state: RootState) => ({
      currentSession: state.session.currentSession,
      progress: state.session.progress,
      isSessionActive: state.session.isSessionActive,
      sessionStartTime: state.session.sessionStartTime,
    }),
    (left, right) =>
      left.currentSession?.id === right.currentSession?.id &&
      left.isSessionActive === right.isSessionActive &&
      left.progress.wordsCompleted === right.progress.wordsCompleted
  );

  const {
    currentWord,
    currentOptions,
    quizMode,
    wordProgress,
    capitalizationFeedback,
    language: gameLanguage,
  } = gameState;

  const {
    currentSession,
    progress: sessionProgress,
    isSessionActive,
    sessionStartTime,
  } = sessionState;

  const [inputValue, setInputValue] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [languageName, setLanguageName] = useState('');
  const [languageFlag, setLanguageFlag] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const [wordTimer, setWordTimer] = useState(0);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showLearningCard, setShowLearningCard] = useState(false);

  // Local feedback state for enhanced learning system
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [lastSelectedAnswer, setLastSelectedAnswer] = useState<string>('');
  const [feedbackQuestionKey, setFeedbackQuestionKey] = useState<string>(''); // Track unique question instance
  const [feedbackWordInfo, setFeedbackWordInfo] = useState<{
    originalWord: string;
    correctAnswer: string;
    context: string;
  } | null>(null);
  const previousWordRef = useRef<string>(''); // Track previous word to detect changes
  const { playCorrect, playIncorrect } = useAudio();

  // Enhanced Learning System Integration
  const {
    isUsingSpacedRepetition,
    handleEnhancedAnswer,
    getCurrentWordInfo,
    getSessionStats,
    forceCompleteSession,
  } = useEnhancedGame(languageCode!, moduleId);

  // Level-up detection
  const { showLevelUp, newLevel, totalXP, closeLevelUp } = useLevelUpDetection();

  // Reset feedback state when word changes
  useEffect(() => {
    const enhancedWordInfo = getCurrentWordInfo();
    const wordToUse = enhancedWordInfo?.word || currentWord;
    const currentQuestionKey = `${wordToUse?.id || 'unknown'}-${
      wordToUse ? getQuestionWord(wordToUse) : 'unknown'
    }`;

    // Clear feedback if word has changed
    if (previousWordRef.current && previousWordRef.current !== currentQuestionKey) {
      setLastAnswerCorrect(null);
      setLastSelectedAnswer('');
      setFeedbackQuestionKey('');
      setFeedbackWordInfo(null); // Clear captured feedback info
    }
    previousWordRef.current = currentQuestionKey;
  }, [currentWord]); // Only depend on currentWord state, not functions // Only depend on currentWord, not the function

  // Memoize expensive mastery calculation and learning card decision
  const wordLearningStatus = useMemo(() => {
    if (!currentWord) return { isTrulyNewWord: false, needsReinforcement: false };

    const currentWordProgress = wordProgress[currentWord.id];

    // Truly new word - never practiced before
    if (!currentWordProgress) {
      return { isTrulyNewWord: true, needsReinforcement: false };
    }

    const currentMastery = calculateMasteryDecay(
      currentWordProgress.lastPracticed || '',
      currentWordProgress.xp || 0
    );

    // Check if word is truly new (very low mastery)
    const isTrulyNewWord = currentMastery < 20;

    // Check if word needs reinforcement due to mistakes
    const needsReinforcement =
      // Recent mistakes: more incorrect than correct answers
      currentWordProgress.timesIncorrect > currentWordProgress.timesCorrect ||
      // Low consecutive correct count (less than 3 in a row)
      ((currentWordProgress.directions?.['term-to-definition']?.consecutiveCorrect || 0) < 3 &&
        (currentWordProgress.directions?.['definition-to-term']?.consecutiveCorrect || 0) < 3) ||
      // Low mastery with some incorrect answers (needs practice)
      (currentMastery < 50 && currentWordProgress.timesIncorrect > 0);

    return { isTrulyNewWord, needsReinforcement };
  }, [currentWord?.id, wordProgress]);

  // Check if we should show learning card for new words or words needing reinforcement
  useEffect(() => {
    if (isUsingSpacedRepetition && currentWord) {
      const enhancedWordInfo = getCurrentWordInfo();
      if (
        enhancedWordInfo &&
        enhancedWordInfo.wordType === 'group' &&
        !enhancedWordInfo.isReviewWord
      ) {
        // Show learning card for truly new words OR words that need reinforcement
        const shouldShowCard =
          wordLearningStatus.isTrulyNewWord || wordLearningStatus.needsReinforcement;
        setShowLearningCard(shouldShowCard);

        // Debug logging for development
        if (process.env.NODE_ENV === 'development' && shouldShowCard) {
          console.log(`📚 Learning card shown for word "${currentWord.term}":`, {
            isNew: wordLearningStatus.isTrulyNewWord,
            needsReinforcement: wordLearningStatus.needsReinforcement,
            wordProgress: wordProgress[currentWord.id],
          });
        }
      } else {
        setShowLearningCard(false);
      }
    } else {
      setShowLearningCard(false);
    }
  }, [isUsingSpacedRepetition, currentWord, wordLearningStatus]); // Use memoized status

  useEffect(() => {
    if (languageCode) {
      dispatch(setLanguage(languageCode));
      dispatch(setSessionLanguage(languageCode)); // Set session language separately

      // Set the current module if provided
      if (moduleId) {
        dispatch(setCurrentModule(moduleId));
      }

      // Get language name and flag from dynamic language data
      const langData = words[languageCode];
      if (langData) {
        setLanguageName(langData.name);
        setLanguageFlag(langData.flag);
      }

      // Load the first word after setting the language
      // Use enhanced system by default
      if (!isUsingSpacedRepetition) {
        // Initialize challenge services for special modes using unified service manager
        if (currentSession?.id && challengeServiceManager.isSessionTypeSupported(currentSession.id)) {
          const config = {
            targetWords: currentSession?.targetWords || 15,
            timeLimit: currentSession?.timeLimit || 5,
            difficulty: 3
          };

          challengeServiceManager.initializeSession(currentSession.id, languageCode, wordProgress, config)
            .then(() => {
              // Get first word using unified service manager
              const context = {
                wordsCompleted: 0,
                currentStreak: 0,
                timeRemaining: config.timeLimit * 60, // Convert to seconds
                targetWords: config.targetWords,
                wordProgress,
                languageCode
              };

              return challengeServiceManager.getNextWord(currentSession.id!, context);
            })
            .then((result) => {
              dispatch(setCurrentWord({
                word: result.word!,
                options: result.options,
                quizMode: result.quizMode,
              }));
            })
            .catch((error) => {
              console.error(`Failed to initialize ${currentSession.id} session:`, error);
              dispatch(nextWord()); // Fallback to regular word selection
            });
        } else {
          dispatch(nextWord());
        }
      }
    }
  }, [dispatch, languageCode, moduleId]); // Removed isUsingSpacedRepetition to prevent infinite loops

  // Reset completion flag when session starts
  useEffect(() => {
    if (isSessionActive && currentSession) {
      setSessionCompleted(false);
      setSessionTimer(0);
      setWordTimer(0);
      setWordStartTime(Date.now());
    }
  }, [isSessionActive, currentSession?.id]); // Reset when session starts or changes

  // Separate effect to check session completion after state updates
  useEffect(() => {
    const checkCompletion = () => {
      if (!currentSession || !isSessionActive || sessionCompleted) return;

      const shouldComplete =
        // Target words reached (if not unlimited)
        (currentSession.targetWords !== -1 &&
          sessionProgress.wordsCompleted >= currentSession.targetWords) ||
        // Time limit exceeded (check current timer, but don't depend on it in useEffect)
        (currentSession.timeLimit && sessionTimer >= currentSession.timeLimit * 60) ||
        // Too many mistakes (for precision mode or streak challenge)
        (currentSession.allowedMistakes !== undefined &&
          sessionProgress.incorrectAnswers >= currentSession.allowedMistakes);

      if (shouldComplete) {
        setSessionCompleted(true); // Prevent multiple completions

        // Add perfect accuracy bonus for Precision Mode
        if (currentSession.id === 'precision-mode' && sessionProgress.incorrectAnswers === 0) {
          dispatch(addPerfectAccuracyBonus());
        }

        // Record analytics for enhanced learning system
        if (isUsingSpacedRepetition) {
          forceCompleteSession();
        }

        dispatch(completeSession());
        navigate(`/completed/${languageCode}`);
      }
    };

    if (isSessionActive && currentSession) {
      checkCompletion();
    }
  }, [
    sessionProgress.wordsCompleted,
    sessionProgress.incorrectAnswers,
    isSessionActive,
    currentSession,
    sessionCompleted,
    dispatch,
    navigate,
    languageCode,
  ]);

  // Separate effect for time-based completion to avoid infinite loops
  useEffect(() => {
    if (isSessionActive && currentSession && !sessionCompleted && currentSession.timeLimit) {
      if (sessionTimer >= currentSession.timeLimit * 60) {
        setSessionCompleted(true);

        // Record analytics for enhanced learning system
        if (isUsingSpacedRepetition) {
          forceCompleteSession();
        }

        dispatch(completeSession());
        navigate(`/completed/${languageCode}`);
      }
    }
  }, [
    sessionTimer,
    isSessionActive,
    currentSession,
    sessionCompleted,
    dispatch,
    navigate,
    languageCode,
  ]);

  // Optimized timer system - single timer for both session and word tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const sessionElapsed = Math.floor((now - sessionStartTime) / 1000);
        setSessionTimer(sessionElapsed);
        dispatch(addTimeElapsed(1));

        // Update word timer for Quick Dash mode
        if (currentSession?.id === 'quick-dash' && wordStartTime && !isTransitioning) {
          const wordElapsed = Math.floor((now - wordStartTime) / 1000);
          setWordTimer(wordElapsed);
        }
      }, 1000); // Single unified timer
    }
    return () => clearInterval(interval);
  }, [
    isSessionActive,
    sessionStartTime,
    currentSession?.id,
    wordStartTime,
    isTransitioning,
    dispatch,
  ]);

  const handleSubmit = (answer: string) => {
    // Always use enhanced learning system
    const isCorrect = checkAnswerCorrectness(answer);

    // Get current word info to track feedback BEFORE any state changes
    const enhancedWordInfo = getCurrentWordInfo();
    const currentWordToUse = enhancedWordInfo?.word || currentWord;
    const quizModeToUse = enhancedWordInfo?.quizMode || quizMode;

    // Capture feedback information immediately before any transitions
    // Use centralized business logic for consistent feedback display
    if (isUnidirectionalMode(quizModeToUse)) {
      // Unidirectional modes: Show Dutch as question, target language as answer
      setFeedbackWordInfo({
        originalWord: getQuizQuestion(currentWordToUse, quizModeToUse), // Dutch translation
        correctAnswer: getQuizAnswer(currentWordToUse, quizModeToUse), // Target language word
        context: typeof currentWordToUse?.context === 'string' ? currentWordToUse.context : '',
      });
    } else {
      // Bidirectional modes: Follow word direction
      setFeedbackWordInfo({
        originalWord: getQuestionWord(currentWordToUse),
        correctAnswer: getAnswerWord(currentWordToUse),
        context: typeof currentWordToUse?.context === 'string' ? currentWordToUse.context : '',
      });
    }

    // Update local feedback state
    setLastAnswerCorrect(isCorrect);
    setLastSelectedAnswer(answer);
    setFeedbackQuestionKey(
      currentWordToUse
        ? `${currentWordToUse.id}-${getQuestionWord(currentWordToUse)}-${Date.now()}`
        : `unknown-${Date.now()}`
    ); // Track unique question instance

    // Play audio feedback
    if (isCorrect) {
      playCorrect();
    } else {
      playIncorrect();
    }

    // Handle enhanced vs standard game logic
    if (isUsingSpacedRepetition) {
      // Use enhanced learning system
      const result = handleEnhancedAnswer(isCorrect);

      if (result && typeof result === 'object' && 'isComplete' in result) {
        if (result.isComplete) {
          // Session completed - show recommendations and analytics
          setSessionCompleted(true);

          // Use the correct language code for navigation
          const actualLanguageCode = gameLanguage || languageCode;

          // Complete the session in Redux store and navigate
          dispatch(completeSession());
          navigate(`/completed/${actualLanguageCode}`);
          return; // Exit early for enhanced session completion
        }
      }
    }

    // Standard game logic (for all sessions, enhanced and non-enhanced)
    // Move to next word
    setInputValue('');
    setIsTransitioning(true);

    // Update session counter if answer was correct and we're in a session
    if (isCorrect && isSessionActive && currentSession) {
      dispatch(incrementWordsCompleted());
      
      // Calculate bonuses based on session type and performance
      const bonuses = {
        timeBonus: 0,
        streakBonus: 0,
        contextBonus: 0,
        perfectRecallBonus: 0,
      };

      // Session-specific bonuses
      if (currentSession.id === 'quick-dash') {
        // Speed bonus up to 50 points per word (based on time remaining)
        const timeRemaining = Math.max(0, (currentSession.timeLimit! * 60) - sessionTimer);
        bonuses.timeBonus = Math.min(50, Math.floor(timeRemaining / 6)); // Up to 50 points
      } else if (currentSession.id === 'deep-dive') {
        // Context bonus +30 points for deep learning
        bonuses.contextBonus = 30;
        // Perfect recall bonus if user has seen this word before and got it right quickly
        if (wordTimer < 3) {
          bonuses.perfectRecallBonus = 100;
        }
      } else if (currentSession.id === 'fill-in-the-blank') {
        // Language comprehension bonus +25
        bonuses.contextBonus = 25;
      }
      
      dispatch(addCorrectAnswer(bonuses));
    }

    // Handle incorrect answers for session tracking
    if (!isCorrect && isSessionActive) {
      dispatch(addIncorrectAnswer());
    }

    // Use setTimeout only for UI delay, then trigger non-blocking async transition
    setTimeout(
      () => {
        // Trigger non-blocking word transition
        handleWordTransition();
      },
      // Fill-in-the-blank needs more time to read context and feedback
      quizModeToUse === 'fill-in-the-blank'
        ? isCorrect
          ? 2500
          : 4500 // Longer for fill-in-the-blank
        : isCorrect
        ? 1200
        : 3000 // Normal timing for other modes
    );
  };

  // Non-blocking async word transition handler
  const handleWordTransition = useCallback(async (transitionType: 'enhanced' | 'standard' | 'quiz' = 'standard', additionalData?: any) => {
    try {
      // Wait for transition timing (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (transitionType === 'enhanced') {
        const result = additionalData;
        if (result && typeof result === 'object' && 'isComplete' in result && result.isComplete) {
          setSessionCompleted(true);
        } else {
          setIsTransitioning(false);
          setWordTimer(0);
          setWordStartTime(Date.now());
        }
        return;
      }

      // Immediately update UI state (non-blocking)
      setIsTransitioning(false);
      setWordTimer(0);
      setWordStartTime(Date.now());

      // Standard word progression - let Redux/game logic handle next word
      if (!isUsingSpacedRepetition) {
        // Use unified challenge service manager for all special modes
        if (currentSession?.id && challengeServiceManager.isSessionTypeSupported(currentSession.id)) {
          const timeRemaining = Math.max(0, (currentSession.timeLimit! * 60) - sessionTimer);
          
          const context = {
            wordsCompleted: sessionProgress.wordsCompleted,
            currentStreak: sessionProgress.currentStreak,
            timeRemaining,
            targetWords: currentSession.targetWords || 15,
            wordProgress,
            languageCode: languageCode!
          };

          // Non-blocking async call
          const result = await challengeServiceManager.getNextWord(currentSession.id, context);
          
          // Only update if component is still mounted and session hasn't changed
          if (result.word) {
            dispatch(setCurrentWord({
              word: result.word,
              options: result.options,
              quizMode: result.quizMode,
            }));
          }
        } else {
          dispatch(nextWord());
        }
      }
    } catch (error) {
      console.error(`Failed to get next word from ${currentSession?.id} service:`, error);
      // Fallback only if we're still in the same session
      dispatch(nextWord());
    }
  }, [
    currentSession?.id, 
    sessionProgress.wordsCompleted, 
    sessionProgress.currentStreak, 
    sessionTimer, 
    wordProgress, 
    languageCode, 
    isUsingSpacedRepetition,
    dispatch
  ]);

  // Helper function to check answer correctness
  const checkAnswerCorrectness = (answer: string): boolean => {
    const enhancedWordInfo = getCurrentWordInfo();
    const wordToUse = enhancedWordInfo?.word || currentWord;

    if (!wordToUse) return false;

    // Use centralized business logic for determining correct answer
    const quizModeToUse = enhancedWordInfo?.quizMode || quizMode;
    const correctAnswer = getQuizAnswer(wordToUse, quizModeToUse);

    return answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  };

  const handleOpenQuestionSubmit = () => {
    handleSubmit(inputValue);
  };

  const handleContinueFromLearningCard = useCallback(() => {
    setShowLearningCard(false);
  }, []);

  // Helper functions to determine quiz direction
  const getQuestionWord = (word: any) => {
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.definition : word.term;
  };

  const getAnswerWord = (word: any) => {
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.term : word.definition;
  };

  /**
   * Business Logic: Quiz Mode Directionality
   *
   * UNIDIRECTIONAL MODES (always Dutch → Target Language):
   * - letter-scramble: User constructs target language word from letters
   * - open-answer: User types target language word from Dutch prompt
   * - fill-in-the-blank: User fills target language word in context
   *
   * BIDIRECTIONAL MODES (respects word.direction):
   * - multiple-choice: Recognition works in both directions
   */
  const isUnidirectionalMode = (quizMode: string): boolean => {
    return ['letter-scramble', 'open-answer', 'fill-in-the-blank'].includes(quizMode);
  };

  const getQuizQuestion = (word: any, quizMode: string): string => {
    if (isUnidirectionalMode(quizMode)) {
      // Unidirectional modes: Show the source language as the question
      // Use word direction to determine which field contains the source language
      if (word.direction === 'term-to-definition') {
        // term=Dutch (source), definition=German (target): show Dutch (term)
        return word.term;
      } else {
        // definition-to-term (default): definition=Dutch (source), term=German (target): show Dutch (definition)
        return word.definition;
      }
    } else {
      // Bidirectional modes follow word direction
      return getQuestionWord(word);
    }
  };

  const getQuizAnswer = (word: any, quizMode: string): string => {
    if (quizMode === 'fill-in-the-blank') {
      // Fill-in-the-blank: We need to return the word that appears in the context sentence
      // This could be either term or definition depending on the sentence language
      if (word.context?.sentence) {
        const sentence = word.context.sentence.toLowerCase();
        const termLower = word.term.toLowerCase();
        const definitionLower = word.definition.toLowerCase();

        // Check if term appears in sentence
        if (sentence.includes(termLower)) {
          return word.term;
        }
        // Check if definition appears in sentence
        if (sentence.includes(definitionLower)) {
          return word.definition;
        }

        // Try without articles for term
        const termWithoutArticle = word.term.replace(/^(der|die|das|ein|eine)\s+/i, '').trim();
        if (sentence.includes(termWithoutArticle.toLowerCase())) {
          return word.term;
        }

        // Try without articles for definition
        const definitionWithoutArticle = word.definition
          .replace(/^(der|die|das|ein|eine)\s+/i, '')
          .trim();
        if (sentence.includes(definitionWithoutArticle.toLowerCase())) {
          return word.definition;
        }
      }

      // Fallback: return German word (term for German words, definition for Dutch words)
      return word.term; // Default fallback
    } else if (isUnidirectionalMode(quizMode)) {
      // For learning German: All unidirectional modes should expect German answers
      // Use the word direction to determine which field contains the German word
      if (word.direction === 'term-to-definition') {
        // term=Dutch, definition=German: return German (definition)
        return word.definition;
      } else {
        // definition-to-term (default): term=German, definition=Dutch: return German (term)
        return word.term;
      }
    } else {
      // Bidirectional modes follow word direction
      return getAnswerWord(word);
    }
  };

  const getContextForDirection = (word: any) => {
    // If word has explicit context field, use it
    if (word.context) {
      if (typeof word.context === 'string') {
        return {
          sentence: word.context,
          translation: word.context,
        };
      }
      return {
        sentence: word.context.sentence || '',
        translation: word.context.translation || '',
      };
    }

    // Fallback: no context available
    return undefined;
  };

  // Memoize context to prevent render loops - moved from renderThemedQuiz to fix hooks order
  const contextForWord = useMemo(() => {
    const enhancedWordInfo = isUsingSpacedRepetition ? getCurrentWordInfo() : null;
    const wordToUse = enhancedWordInfo?.word || currentWord;

    // Add null check to prevent error when word is not loaded yet
    if (!wordToUse) {
      return undefined;
    }

    return getContextForDirection(wordToUse);
  }, [currentWord?.id, currentWord?.context, isUsingSpacedRepetition, getCurrentWordInfo]);

  if (!currentWord) {
    return <UnifiedLoading text="Loading words..." />;
  }

  // If we're in session mode but no session is active, redirect to session selection
  // Only redirect if we're specifically on the /game/{lang}/session route, not completed
  const isSessionGameRoute = window.location.pathname.endsWith('/session');
  if (isSessionGameRoute && !isSessionActive) {
    navigate(`/sessions/${languageCode}`);
    return <UnifiedLoading text="Redirecting to session selection..." />;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to render themed quiz based on session type
  const renderThemedQuiz = () => {
    // Get word info from enhanced system if available
    const enhancedWordInfo = isUsingSpacedRepetition ? getCurrentWordInfo() : null;
    const wordToUse = enhancedWordInfo?.word || currentWord;
    let quizModeToUse = enhancedWordInfo?.quizMode || quizMode;
    const optionsToUse = enhancedWordInfo?.options || currentOptions || [];

    // Session-specific quiz mode overrides
    if (currentSession?.id === 'fill-in-the-blank') {
      // Only use fill-in-the-blank if the word has context, otherwise fallback to open-answer
      const hasContext = wordToUse.context && wordToUse.context.sentence;
      quizModeToUse = hasContext ? 'fill-in-the-blank' : 'open-answer';
    }

    // Generate unique key for current question
    const currentQuestionKey = `${wordToUse.id}-${getQuestionWord(wordToUse)}`;

    // Only show feedback if it belongs to the current question instance
    const shouldShowFeedback = feedbackQuestionKey.startsWith(currentQuestionKey);
    const currentAnswerCorrect = shouldShowFeedback ? lastAnswerCorrect : null;
    const currentSelectedAnswer = shouldShowFeedback ? lastSelectedAnswer : '';

    const quizContent =
      showLearningCard && isUsingSpacedRepetition ? (
        <LearningCard
          word={wordToUse}
          currentIndex={getSessionStats()?.currentIndex || 0}
          totalWords={getSessionStats()?.totalWords || 1}
          onContinue={handleContinueFromLearningCard}
          autoAdvance={true}
          autoAdvanceDelay={4000} // 4 seconds to read the word
          reason={wordLearningStatus.isTrulyNewWord ? 'new' : 'reinforcement'}
        />
      ) : (
        <>
          {quizModeToUse === 'multiple-choice' ? (
            <MultipleChoiceQuiz
              key={`mc-${wordToUse.id}-${getQuizQuestion(wordToUse, quizModeToUse)}`} // Force remount on word change
              word={getQuizQuestion(wordToUse, quizModeToUse)}
              options={optionsToUse}
              onSelect={handleSubmit}
              isCorrect={currentAnswerCorrect === true}
              selectedOption={currentSelectedAnswer}
              disabled={isTransitioning}
              level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
              xp={wordProgress[wordToUse.id]?.xp || 0}
              context={contextForWord}
            />
          ) : quizModeToUse === 'letter-scramble' ? (
            <LetterScrambleQuiz
              key={`ls-${wordToUse.id}-${getQuizAnswer(wordToUse, quizModeToUse)}`} // Force remount on word change
              word={getQuizAnswer(wordToUse, quizModeToUse)} // Always scramble the target language word (German/Spanish)
              definition={getQuizQuestion(wordToUse, quizModeToUse)} // Show Dutch translation as hint
              context={contextForWord}
              currentWord={(getSessionStats()?.currentIndex || 0) + 1}
              totalWords={getSessionStats()?.totalWords || 10}
              disabled={isTransitioning}
              onAnswer={correct => {
                // Track feedback and play audio
                setLastAnswerCorrect(correct);
                setFeedbackQuestionKey(`${wordToUse.id}-${wordToUse.term}-${Date.now()}`); // Track unique question instance
                if (correct) {
                  playCorrect();
                } else {
                  playIncorrect();
                }

                // Handle enhanced vs standard game logic
                if (isUsingSpacedRepetition) {
                  // Process answer through enhanced learning system
                  const result = handleEnhancedAnswer(correct);
                  
                  // Use non-blocking transition handler
                  handleWordTransition('enhanced', result);
                } else {
                  // Standard game logic for non-enhanced sessions
                  setIsTransitioning(true);
                  
                  // Update session state
                  if (correct && isSessionActive && currentSession) {
                    dispatch(incrementWordsCompleted());
                    dispatch(addCorrectAnswer({}));
                  }
                  if (!correct && isSessionActive) {
                    dispatch(addIncorrectAnswer());
                  }

                  // Use non-blocking transition handler for quiz modes
                  handleWordTransition('quiz');
                }
              }}
            />
          ) : quizModeToUse === 'fill-in-the-blank' ? (
            <FillInTheBlankQuiz
              key={`fib-${wordToUse.id}-${getQuizAnswer(wordToUse, quizModeToUse)}`} // Force remount on word change
              word={getQuizAnswer(wordToUse, quizModeToUse)} // Always ask for the target language (German/Spanish)
              userAnswer={inputValue}
              onAnswerChange={setInputValue}
              onSubmit={handleOpenQuestionSubmit}
              isCorrect={currentAnswerCorrect === true}
              disabled={isTransitioning}
              level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
              xp={wordProgress[wordToUse.id]?.xp || 0}
              context={contextForWord}
              currentWord={(getSessionStats()?.currentIndex || 0) + 1}
              totalWords={getSessionStats()?.totalWords || 10}
            />
          ) : (
            <OpenQuestionQuiz
              key={`oq-${wordToUse.id}-${getQuizAnswer(wordToUse, quizModeToUse)}`} // Force remount on word change
              word={getQuizQuestion(wordToUse, quizModeToUse)} // Show Dutch translation as the question
              userAnswer={inputValue}
              onAnswerChange={setInputValue}
              onSubmit={handleOpenQuestionSubmit}
              isCorrect={currentAnswerCorrect === true}
              disabled={isTransitioning}
              level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
              xp={wordProgress[wordToUse.id]?.xp || 0}
              context={contextForWord}
            />
          )}
        </>
      );

    if (!isSessionActive || !currentSession) {
      return quizContent;
    }

    // Calculate metrics for UI effects
    const currentSpeed =
      currentSession.id === 'quick-dash' && wordTimer > 0
        ? Math.max(0, 100 - wordTimer * 10) // 10% per second decrease
        : sessionTimer > 0
        ? Math.max(0, 100 - sessionTimer * 2)
        : 100;
    const accuracy =
      sessionProgress.correctAnswers + sessionProgress.incorrectAnswers > 0
        ? Math.round(
            (sessionProgress.correctAnswers /
              (sessionProgress.correctAnswers + sessionProgress.incorrectAnswers)) *
              100
          )
        : 100;
    const knowledgeLevel = Math.min(
      100,
      sessionProgress.correctAnswers * 5 + sessionProgress.currentStreak * 10
    );
    const bossHealth = Math.max(0, 100 - sessionProgress.wordsCompleted * 4);

    switch (currentSession.id) {
      case 'quick-dash':
        return (
          <QuickDashContainer>
            <SpeedMeter speed={currentSpeed}>Speed: {currentSpeed}%</SpeedMeter>
            {quizContent}
          </QuickDashContainer>
        );

      case 'deep-dive':
        return (
          <DeepDiveContainer>
            <BrainMeter knowledge={knowledgeLevel} />
            {quizContent}
          </DeepDiveContainer>
        );

      case 'streak-challenge':
        return (
          <StreakChallengeContainer streak={sessionProgress.currentStreak}>
            <StreakMultiplier streak={sessionProgress.currentStreak}>
              {sessionProgress.currentStreak > 0
                ? `x${Math.min(
                    Math.pow(1.5, Math.min(sessionProgress.currentStreak, 20)),
                    8
                  ).toFixed(1)}`
                : 'x1.0'}
            </StreakMultiplier>
            {quizContent}
          </StreakChallengeContainer>
        );

      case 'precision-mode':
        return (
          <PrecisionModeContainer>
            <AccuracyMeter accuracy={accuracy} />
            {quizContent}
          </PrecisionModeContainer>
        );

      case 'fill-in-the-blank':
        return (
          <FillInTheBlankContainer>
            <ContextMeter contextualWords={sessionProgress.wordsCompleted} />
            {quizContent}
          </FillInTheBlankContainer>
        );

      case 'boss-battle':
        return (
          <BossBattleContainer damage={false}>
            <BossHealthBar health={bossHealth}>
              <BossAvatar health={bossHealth} />
              <BossNamePlate>
                <BossName>🗡️ Word Destroyer</BossName>
                <BossTitle>Master of Confusion</BossTitle>
              </BossNamePlate>
              <HealthBarContainer>
                <HealthBarBackground>
                  <HealthBarFill health={bossHealth} />
                </HealthBarBackground>
                <HealthText health={bossHealth}>{bossHealth}% HP</HealthText>
              </HealthBarContainer>
            </BossHealthBar>
            {quizContent}
          </BossBattleContainer>
        );

      default:
        return quizContent;
    }
  };

  return (
    <>
      <Navigation languageName={languageName} languageFlag={languageFlag} />
      <GameContainer>
        {isSessionActive && currentSession && (
          <SessionProgressBar>
            <ProgressItem variant="score">
              <ProgressValue variant="score">{sessionProgress.score}</ProgressValue>
              <ProgressLabel>Score</ProgressLabel>
            </ProgressItem>
            <ProgressItem variant="words">
              <ProgressValue variant="words">
                {currentSession.targetWords === -1
                  ? sessionProgress.wordsCompleted
                  : `${sessionProgress.wordsCompleted}/${currentSession.targetWords}`}
              </ProgressValue>
              <ProgressLabel>Words</ProgressLabel>
            </ProgressItem>
            <ProgressItem variant="streak">
              <ProgressValue variant="streak">{sessionProgress.currentStreak}</ProgressValue>
              <ProgressLabel>Streak</ProgressLabel>
            </ProgressItem>
            {currentSession.timeLimit && (
              <ProgressItem variant="time">
                <ProgressValue variant="time">{formatTime(sessionTimer)}</ProgressValue>
                <ProgressLabel>Time</ProgressLabel>
              </ProgressItem>
            )}
            {currentSession.allowedMistakes !== undefined && (
              <ProgressItem variant="lives">
                <ProgressValue variant="lives">
                  {currentSession.allowedMistakes - sessionProgress.incorrectAnswers}
                </ProgressValue>
                <ProgressLabel>Lives</ProgressLabel>
              </ProgressItem>
            )}
          </SessionProgressBar>
        )}

        {/* Show learning progress when not in session mode */}
        {!isSessionActive && (
          <>
            <LearningProgress enhanced />
            <StorageManagement compact />
          </>
        )}

        <GameContent>
          {/* Boss Battle Indicator for final word */}
          {isSessionActive &&
            currentSession?.id === 'boss-battle' &&
            sessionProgress.wordsCompleted >= currentSession.targetWords - 1 && (
              <BossIndicator>⚔️ BOSS WORD - FINAL CHALLENGE! ⚔️</BossIndicator>
            )}

          {renderThemedQuiz()}
        </GameContent>
        <SkipButtonContainer>
          <Button
            onClick={() => {
              // Use unified challenge service manager for all special modes
              if (currentSession?.id && challengeServiceManager.isSessionTypeSupported(currentSession.id) && !isUsingSpacedRepetition) {
                // For streak challenges, reset the service first
                if (currentSession.id === 'streak-challenge') {
                  challengeServiceManager.resetSession(currentSession.id);
                }
                
                const timeRemaining = Math.max(0, (currentSession.timeLimit! * 60) - sessionTimer);
                
                const context = {
                  wordsCompleted: sessionProgress.wordsCompleted,
                  currentStreak: 0, // Reset streak on skip
                  timeRemaining,
                  targetWords: currentSession.targetWords || 15,
                  wordProgress,
                  languageCode: languageCode!
                };

                challengeServiceManager.getNextWord(currentSession.id, context)
                  .then((result) => {
                    dispatch(setCurrentWord({
                      word: result.word!,
                      options: result.options,
                      quizMode: result.quizMode,
                    }));
                  })
                  .catch((error) => {
                    console.error(`Failed to get next word from ${currentSession.id} service on skip:`, error);
                    dispatch(nextWord()); // Fallback
                  });
              } else {
                dispatch(nextWord());
              }
              
              // Increment words completed in session if session is active
              if (isSessionActive && currentSession) {
                dispatch(incrementWordsCompleted());
                // Don't add bonus for skipped words
                dispatch(addCorrectAnswer({}));
              }
            }}
            disabled={isTransitioning}
          >
            Skip
          </Button>
        </SkipButtonContainer>
      </GameContainer>
      <FeedbackOverlay
        isCorrect={lastAnswerCorrect}
        correctAnswer={feedbackWordInfo?.correctAnswer || ''}
        originalWord={feedbackWordInfo?.originalWord || ''}
        wordContext={
          feedbackWordInfo?.context
            ? typeof feedbackWordInfo.context === 'string'
              ? feedbackWordInfo.context
              : (feedbackWordInfo.context as any)?.sentence ||
                (feedbackWordInfo.context as any)?.translation ||
                ''
            : ''
        }
        capitalizationFeedback={capitalizationFeedback}
      />
      <AchievementManager />

      {/* Level Up Notification */}
      {showLevelUp && (
        <LevelUpNotification newLevel={newLevel} totalXP={totalXP} onClose={closeLevelUp} />
      )}
    </>
  );
};

// Memoize the Game component to prevent unnecessary re-renders
export default React.memo(Game);
