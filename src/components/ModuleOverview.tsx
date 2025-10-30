// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: Clean up unused styled components and variables (14 issues identified)
// This suppression will be removed once unused variables are cleaned up
// See docs/TYPESCRIPT_STRICT_MODE_PLAN.md for gradual cleanup strategy

import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../store/store';
import { setLanguage, setCurrentModule } from '../store/gameSlice';
import { resetSession, startSession } from '../store/sessionSlice';
import { Navigation } from './Navigation';
import { getLanguageInfo, getModulesForLanguage, getModuleStats } from '../services/moduleService';
import { DataMigrationService } from '../services/dataMigrationService';

const OverviewContainer = styled.div`
  min-height: 100vh;
  padding-top: 90px; /* Account for Navigation (70px) + extra spacing */
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
  display: flex;
  flex-direction: column;
  align-items: center;

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding-top: 70px;
  }
`;

const MainContent = styled.div`
  flex: 1;
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 1200px;
  width: 100%;

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Action button styling
const ActionButtonRow = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  justify-content: center;
  margin-bottom: ${props => props.theme.spacing.lg};
  flex-wrap: wrap;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.md};
  }
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: ${props => props.theme.colors.text};
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    font-size: 0.85rem;
  }
`;
// Simplified stats display for quick overview
const QuickStats = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  flex-wrap: wrap;
  justify-content: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
  }
`;

const QuickStatCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.md};
  text-align: center;
  min-width: 100px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    min-width: 80px;
  }
`;

const QuickStatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 4px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

const QuickStatLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.lg};
  max-width: 800px;
  width: 100%;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    margin-bottom: ${props => props.theme.spacing.md};
    max-width: 600px;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    margin-bottom: ${props => props.theme.spacing.md};
    max-width: 100%;
    padding: 0 ${props => props.theme.spacing.sm};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    margin-bottom: ${props => props.theme.spacing.sm};
  }
`;

const LanguageTitle = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.xs};
  background: linear-gradient(45deg, #4caf50, #81c784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;

  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    font-size: 2rem;
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    font-size: 1.9rem;
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.8rem;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.8rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 1.6rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
  text-align: center;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.95rem;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
    line-height: 1.4;
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 0.9rem;
  }
`;

const ModulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: ${props => props.theme.spacing.xl};
  max-width: 1400px;
  width: 100%;

  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: ${props => props.theme.spacing.lg};
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: ${props => props.theme.spacing.md};
    max-width: 100%;
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: ${props => props.theme.spacing.md};
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.lg};
    padding: 0 ${props => props.theme.spacing.sm};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    gap: ${props => props.theme.spacing.md};
    padding: 0 ${props => props.theme.spacing.xs};
  }
`;

const ModuleCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.xl};
  text-align: left;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  display: flex;
  gap: ${props => props.theme.spacing.lg};
  min-height: 240px;
  width: 100%;
  position: relative;
  overflow: hidden;

  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    padding: ${props => props.theme.spacing.lg};
    min-height: 220px;
    gap: ${props => props.theme.spacing.md};
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    min-height: 200px;
    padding: ${props => props.theme.spacing.lg};
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
    min-height: 180px;
    gap: ${props => props.theme.spacing.sm};
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
    flex-direction: column;
    min-height: auto;
    gap: ${props => props.theme.spacing.md};
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    padding: ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.sm};
    border-radius: 8px;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4caf50, #81c784);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    border-color: #4caf50;
    
    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: none; /* Disable hover effects on mobile for better touch experience */
    }
  }
`;

const ModuleHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.md};
  width: 100%;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.md};
    align-items: center;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.sm};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    gap: ${props => props.theme.spacing.xs};
  }
`;

const ModuleContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Important for text truncation */
`;

const ModuleActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  min-width: 140px;
  text-align: center;
  padding: ${props => props.theme.spacing.sm};
  flex-shrink: 0;

  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    min-width: 120px;
    padding: ${props => props.theme.spacing.xs};
    gap: ${props => props.theme.spacing.xs};
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    min-width: 110px;
    gap: ${props => props.theme.spacing.xs};
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    min-width: 100px;
    padding: ${props => props.theme.spacing.xs};
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    min-width: auto;
    width: 100%;
    padding: 0;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.md};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    gap: ${props => props.theme.spacing.xs};
    margin-top: ${props => props.theme.spacing.sm};
  }
`;

const ModuleIcon = styled.span`
  font-size: 2rem;
  
  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.8rem;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2.2rem;
    margin-bottom: ${props => props.theme.spacing.xs};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 2rem;
  }
`;

const ModuleInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`;

const ModuleName = styled.h3`
  color: ${props => props.theme.colors.text || '#ffffff'};
  margin: 0 0 ${props => props.theme.spacing.xs} 0;
  font-size: 1.3rem;
  line-height: 1.3;
  font-weight: 600;
  display: block;
  visibility: visible;
  opacity: 1;
  max-width: 100%;

  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    font-size: 1.25rem;
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    font-size: 1.2rem;
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.15rem;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: ${props => props.theme.spacing.sm};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 1.3rem;
  }
`;

const ModuleDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary || '#cccccc'};
  margin: ${props => props.theme.spacing.xs} 0;
  font-size: 0.9rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  visibility: visible;
  opacity: 1;
  word-wrap: break-word;
  
  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    font-size: 0.85rem;
    -webkit-line-clamp: 2;
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    font-size: 0.85rem;
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.8rem;
    line-height: 1.3;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
    margin: ${props => props.theme.spacing.sm} 0 ${props => props.theme.spacing.md} 0;
    line-height: 1.4;
    -webkit-line-clamp: 3;
    display: -webkit-box;
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 0.9rem;
    margin: ${props => props.theme.spacing.xs} 0 ${props => props.theme.spacing.sm} 0;
  }
`;

const DifficultyBadge = styled.span<{ difficulty: string }>`
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
  align-self: flex-start;
  background-color: ${props => {
    switch (props.difficulty) {
      case 'beginner':
        return '#4caf50';
      case 'intermediate':
        return '#ff9800';
      case 'advanced':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }};
  color: white;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.7rem;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.8rem;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.borderRadius.md};
    align-self: flex-start;
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 0.75rem;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  }
`;

const StatsContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
  margin-top: auto;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.sm};
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: rgba(0, 0, 0, 0.2);
    border-radius: ${props => props.theme.borderRadius.md};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    padding: ${props => props.theme.spacing.sm};
    gap: ${props => props.theme.spacing.xs};
  }
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.xs} 0;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} 0;
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    padding: ${props => props.theme.spacing.xs} 0;
  }
`;

const StatLabel = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.85rem;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
    font-weight: 500;
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 0.9rem;
  }
`;

const StatValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-weight: 600;

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.95rem;
    font-weight: 600;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.1rem;
    font-weight: 700;
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    font-size: 1rem;
  }
`;

const ModuleProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 3px;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    height: 8px;
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background-color: ${props => props.theme.colors.primary};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const AnalyticsSection = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const AnalyticsTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  font-size: 1.1rem;
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
`;

const AnalyticCard = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.sm};
  text-align: center;
  border: 1px solid ${props => props.theme.colors.primary}20;
`;

const AnalyticValue = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const AnalyticLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AnalyticsSubSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const SectionHeader = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const RecommendationCard = styled.div`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  font-size: 0.85rem;
  color: ${props => props.theme.colors.text};
  border-left: 3px solid #4caf50;
  margin-bottom: ${props => props.theme.spacing.sm};
  display: flex;
  align-items: flex-start;
  gap: ${props => props.theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.3);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const WeeklyProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.sm};
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    margin-bottom: 0;
  }
`;

const WeekLabel = styled.span`
  min-width: 50px;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

const ProgressBar = styled.div<{ width: number; color: string }>`
  height: 8px;
  background: ${props => props.color};
  border-radius: 4px;
  width: ${props => Math.max(20, props.width)}%;
  max-width: 80px;
  position: relative;
  overflow: hidden;

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
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const ProgressStats = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 0.75rem;
  font-weight: 400;
`;

const ActivityCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  font-size: 0.85rem;
  color: ${props => props.theme.colors.text};
  border-left: 3px solid #4caf50;
  margin-bottom: ${props => props.theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ScoreDisplay = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const ScoreValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const ScoreLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const QuickPracticeButton = styled.button`
  background: linear-gradient(45deg, #4caf50, #66bb6a);
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 100%;
  min-height: ${props => props.theme.touchTarget.minimum};

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 14px 18px;
    font-size: 0.95rem;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 16px 24px;
    font-size: 1.1rem;
    font-weight: 700;
    border-radius: 14px;
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
    min-height: ${props => props.theme.touchTarget.comfortable};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    padding: 14px 20px;
    font-size: 1rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: none;
      background: linear-gradient(45deg, #43a047, #5cb860);
    }
  }

  &:active {
    transform: translateY(0);

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: scale(0.98);
    }
  }
`;

const ViewDetailsButton = styled.button`
  background: linear-gradient(45deg, #3b82f6, #6366f1);
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 100%;
  margin-bottom: ${props => props.theme.spacing.sm};
  min-height: ${props => props.theme.touchTarget.minimum};

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 14px 18px;
    font-size: 0.95rem;
    margin-bottom: ${props => props.theme.spacing.xs};
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 14px 24px;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 12px;
    margin-bottom: 0;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.5);
    backdrop-filter: blur(10px);
    min-height: ${props => props.theme.touchTarget.comfortable};
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    padding: 12px 20px;
    font-size: 0.95rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    background: linear-gradient(45deg, #2563eb, #4f46e5);

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: none;
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.7);
    }
  }

  &:active {
    transform: translateY(0);

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: scale(0.98);
    }
  }
`;

const MainMixedPracticeButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  padding: 16px 32px;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  justify-content: center;
  min-width: 200px;
  min-height: ${props => props.theme.touchTarget.minimum};

  /* Large tablets and small desktops */
  @media (max-width: 1200px) {
    padding: 15px 28px;
    font-size: 1.05rem;
  }

  /* Standard tablets */
  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    padding: 14px 26px;
    font-size: 1rem;
    min-width: 180px;
  }

  /* Small tablets */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 14px 24px;
    font-size: 1rem;
    min-width: 160px;
    border-radius: 14px;
  }

  /* Mobile devices */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 16px 24px;
    font-size: 1.1rem;
    font-weight: 700;
    min-width: auto;
    width: 100%;
    max-width: 320px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  }

  /* Very small mobile devices */
  @media (max-width: 400px) {
    padding: 14px 20px;
    font-size: 1rem;
    max-width: 280px;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, #5a6fd8 0%, #6b3fa0 100%);

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: none; /* Disable hover effects on mobile */
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
    }
  }

  &:active {
    transform: translateY(-1px);

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      transform: scale(0.98);
    }
  }
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

  const reduxWordProgress = useSelector((state: RootState) => state.game.wordProgress);
  const currentLanguage = useSelector((state: RootState) => state.game.language);

  // Set language IMMEDIATELY if needed (synchronous)
  React.useLayoutEffect(() => {
    if (languageCode && currentLanguage !== languageCode) {
      dispatch(setLanguage(languageCode));
    }
  }, [languageCode, currentLanguage, dispatch]);

  // Load word progress for the current language
  // Always prefer Redux state when language matches, fallback to storage otherwise
  const wordProgress = useMemo(() => {
    if (!languageCode) return {};

    // If Redux has the correct language set and has word progress, use it
    if (currentLanguage === languageCode && Object.keys(reduxWordProgress).length > 0) {
      return reduxWordProgress;
    }

    // Fallback: Load directly from storage for this language with automatic migration
    // This handles the case where Redux hasn't been updated yet
    return DataMigrationService.safeLoadWordProgress(languageCode);
  }, [languageCode, reduxWordProgress, currentLanguage]);

  const language = useMemo(() => {
    if (!languageCode) return null;
    return getLanguageInfo(languageCode);
  }, [languageCode]);

  const modules = useMemo(() => {
    if (!languageCode) return [];
    return getModulesForLanguage(languageCode);
  }, [languageCode]);

  const handleMixedPractice = () => {
    if (!languageCode) return;

    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(null)); // No specific module for mixed practice
    dispatch(resetSession());
    // Start a Deep Dive session for mixed practice (good balance of words and time)
    dispatch(startSession('deep-dive'));
    // Navigate directly to the game for mixed practice
    navigate(`/game/${languageCode}/session`);
  };

  const handleModulePractice = (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the module click
    if (!languageCode) return;

    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(moduleId));
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}/${moduleId}`);
  };

  const handleViewModuleDetails = (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the module click
    if (!languageCode) return;

    // Navigate to the module details view
    navigate(`/language/${languageCode}/${moduleId}`);
  };

  if (!language || !languageCode) {
    return (
      <OverviewContainer>
        <Navigation />
        <MainContent>
          <EmptyState>
            <h2>Language not found</h2>
            <p>The requested language could not be found.</p>
          </EmptyState>
        </MainContent>
      </OverviewContainer>
    );
  }

  return (
    <>
      <Navigation
        languageName={language.name}
        languageFlag={language.flag}
        showUserProfile={true}
      />
      <OverviewContainer>
        <MainContent>
          <Header>
            <LanguageTitle>Choose Your Module</LanguageTitle>
            <Subtitle>Select a module to start your learning journey!</Subtitle>
          </Header>

          {/* Simple stats overview */}
          {Object.keys(wordProgress).length > 0 && (
            <QuickStats>
              <QuickStatCard>
                <QuickStatValue>🧠 {Object.keys(wordProgress).filter(id => wordProgress[id]?.xp > 0).length}</QuickStatValue>
                <QuickStatLabel>Words Learned</QuickStatLabel>
              </QuickStatCard>
              <QuickStatCard>
                <QuickStatValue>📚 {modules.filter(m => {
                  const stats = getModuleStats(languageCode!, m.id, wordProgress);
                  return stats.completionPercentage > 0;
                }).length}</QuickStatValue>
                <QuickStatLabel>Modules Started</QuickStatLabel>
              </QuickStatCard>
              <QuickStatCard>
                <QuickStatValue>⚡ {Object.values(wordProgress).reduce((sum: number, p: any) => sum + (p?.xp || 0), 0)}</QuickStatValue>
                <QuickStatLabel>Total XP</QuickStatLabel>
              </QuickStatCard>
            </QuickStats>
          )}

          {/* Action buttons */}
          <ActionButtonRow>
            <ActionButton onClick={() => navigate(`/stats/${languageCode}`)}>
              📊 View Detailed Analytics
            </ActionButton>
            {Object.keys(wordProgress).length > 0 && (
              <ActionButton onClick={() => navigate(`/overview/${languageCode}`)}>
                🏆 View Achievements
              </ActionButton>
            )}
          </ActionButtonRow>

          {/* Mixed Practice Button - prominently placed */}
          <MainMixedPracticeButton onClick={handleMixedPractice}>
            🎯 Mixed Practice
          </MainMixedPracticeButton>

          {modules.length === 0 ? (
            <EmptyState>
              <h3>No modules available</h3>
              <p>Modules for this language are coming soon!</p>
            </EmptyState>
          ) : (
            <ModulesGrid>
              {modules.map(module => {
                const stats = getModuleStats(languageCode!, module.id, wordProgress);

                return (
                  <ModuleCard key={module.id}>
                    <ModuleContent>
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
                          <StatValue>
                            {stats.wordsLearned}/{stats.totalWords}
                          </StatValue>
                        </StatRow>

                        <ModuleProgressBar>
                          <ProgressFill progress={stats.completionPercentage} />
                        </ModuleProgressBar>

                        <StatRow>
                          <StatLabel>Progress</StatLabel>
                          <StatValue>{stats.completionPercentage}%</StatValue>
                        </StatRow>
                      </StatsContainer>
                    </ModuleContent>

                    <ModuleActions>
                      <ScoreDisplay>
                        <ScoreValue>{stats.completionPercentage}%</ScoreValue>
                        <ScoreLabel>Progress</ScoreLabel>
                      </ScoreDisplay>

                      <ViewDetailsButton onClick={e => handleViewModuleDetails(module.id, e)}>
                        📊 View Details
                      </ViewDetailsButton>

                      <QuickPracticeButton onClick={e => handleModulePractice(module.id, e)}>
                        🎯 Practice
                      </QuickPracticeButton>
                    </ModuleActions>
                  </ModuleCard>
                );
              })}
            </ModulesGrid>
          )}
        </MainContent>
      </OverviewContainer>
    </>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(ModuleOverview);
