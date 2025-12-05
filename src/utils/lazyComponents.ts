import { lazy } from 'react';

// Lazy load heavy components to improve initial bundle size
// These components are loaded only when needed

// Heavy components that can be code-split
export const GameLazy = lazy(() =>
  import('../components/Game').then(module => ({ default: module.Game }))
);

export const UserProfilePageLazy = lazy(() =>
  import('../components/UserProfilePage').then(module => ({ default: module.UserProfilePage }))
);

export const ModuleOverviewLazy = lazy(() =>
  import('../components/ModuleOverview').then(module => ({ default: module.ModuleOverview }))
);

export const SessionSelectLazy = lazy(() =>
  import('../components/SessionSelect').then(module => ({ default: module.SessionSelect }))
);

export const SessionCompletionLazy = lazy(() =>
  import('../components/SessionCompletion').then(module => ({ default: module.SessionCompletion }))
);

export const LearningStatsPageLazy = lazy(() =>
  import('../components/LearningStatsPage').then(module => ({ default: module.LearningStatsPage }))
);

// Pre-load critical components immediately (no lazy loading)
export { LanguagesOverview } from '../components/LanguagesOverview';
export { Navigation } from '../components/Navigation';
export { ErrorBoundary } from '../components/feedback/ErrorBoundary';
export { ModuleProgressView } from '../components/ModuleProgressView';
export { LanguageOverview } from '../components/LanguageOverview';
