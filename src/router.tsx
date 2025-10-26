import { createBrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import React from 'react';
import { RootState } from './store/store';
import { AppLayout } from './components/AppLayout';
import { SettingsPage } from './components/SettingsPage';
import {
  LanguagesOverview,
  ModuleProgressView,
  LanguageOverview,
  GameLazy,
  UserProfilePageLazy,
  ModuleOverviewLazy,
  SessionSelectLazy,
  SessionCompletionLazy,
  LearningStatsPageLazy,
} from './utils/lazyComponents';

const LoadingStatesDemoLazy = React.lazy(() => import('./components/LoadingStatesDemo'));
const ComponentLibraryDemoLazy = React.lazy(() => import('./components/ComponentLibraryDemo'));
const AdvancedAISystemDemoLazy = React.lazy(() => import('./components/AdvancedAISystemDemo'));
const DeveloperDashboardLazy = React.lazy(() => import('./components/DeveloperDashboard'));

import { LazyWrapper, SkeletonLayout } from './components/feedback/UnifiedLoading';

// Wrapper component to pass languageCode and moduleId to SessionSelect
const SessionSelectWrapper = () => {
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId?: string }>();
  return (
    <LazyWrapper 
      fallback={() => (
        <div style={{ padding: '20px' }}>
          <SkeletonLayout type="card" count={2} />
        </div>
      )}
      loadingText="Loading session options..."
    >
      <SessionSelectLazy languageCode={languageCode || ''} moduleId={moduleId} />
    </LazyWrapper>
  );
};

// Wrapper component to pass languageCode and moduleId to SessionCompletion
const SessionCompletionWrapper = () => {
  const { languageCode } = useParams<{ languageCode: string }>();
  const moduleId = useSelector((state: RootState) => state.game.module);
  return (
    <LazyWrapper loadingText="Preparing your results...">
      <SessionCompletionLazy languageCode={languageCode || ''} moduleId={moduleId || undefined} />
    </LazyWrapper>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <LanguagesOverview />,
      },
      {
        path: 'profile',
        element: (
          <LazyWrapper loadingText="Loading profile...">
            <UserProfilePageLazy />
          </LazyWrapper>
        ),
      },
      {
        path: 'language/:languageCode',
        element: (
          <LazyWrapper 
            fallback={() => (
              <div style={{ padding: '20px' }}>
                <SkeletonLayout type="card" count={2} />
              </div>
            )}
            loadingText="Loading modules..."
          >
            <ModuleOverviewLazy />
          </LazyWrapper>
        ),
      },
      {
        path: 'language/:languageCode/:moduleId',
        element: <ModuleProgressView />,
      },
      {
        path: 'stats/:languageCode',
        element: (
          <LazyWrapper loadingText="Loading learning analytics...">
            <LearningStatsPageLazy />
          </LazyWrapper>
        ),
      },
      {
        path: 'overview/:language',
        element: <LanguageOverview />,
      },
      {
        path: 'developer-dashboard',
        element: (
          <LazyWrapper loadingText="Loading Developer Dashboard...">
            <DeveloperDashboardLazy />
          </LazyWrapper>
        ),
      },
      {
        path: 'loading-demo',
        element: (
          <LazyWrapper loadingText="Loading demo...">
            <LoadingStatesDemoLazy />
          </LazyWrapper>
        ),
      },
      {
        path: 'components-demo',
        element: (
          <LazyWrapper loadingText="Loading component library...">
            <ComponentLibraryDemoLazy />
          </LazyWrapper>
        ),
      },
      {
        path: 'simple-ai-demo',
        element: (
          <LazyWrapper loadingText="Loading Advanced AI System demo...">
            <AdvancedAISystemDemoLazy languageCode="de" />
          </LazyWrapper>
        ),
      },
      {
        path: 'ai-system-demo',
        element: (
          <LazyWrapper loadingText="Loading Advanced AI System demo...">
            <AdvancedAISystemDemoLazy languageCode="de" />
          </LazyWrapper>
        ),
      },
      // TEMPORARILY DISABLED - AI DEMO NEEDS REFACTORING
      // {
      //   path: 'ai-demo',
      //   element: (
      //     <LazyWrapper loadingText="Loading AI learning demo...">
      //       <AILearningDemoLazy />
      //     </LazyWrapper>
      //   ),
      // },
      {
        path: 'sessions/:languageCode',
        element: <SessionSelectWrapper />,
      },
      {
        path: 'sessions/:languageCode/:moduleId',
        element: <SessionSelectWrapper />,
      },
      {
        path: 'completed/:languageCode',
        element: <SessionCompletionWrapper />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  // Game routes without bottom navigation for better focus
  {
    path: '/game/:languageCode',
    element: (
      <AppLayout showBottomNav={false}>
        <LazyWrapper 
          fallback={() => (
            <div style={{ padding: '20px' }}>
              <SkeletonLayout type="game" />
            </div>
          )}
          loadingText="Starting game..."
        >
          <GameLazy />
        </LazyWrapper>
      </AppLayout>
    ),
  },
  {
    path: '/game/:languageCode/session',
    element: (
      <AppLayout showBottomNav={false}>
        <LazyWrapper 
          fallback={() => (
            <div style={{ padding: '20px' }}>
              <SkeletonLayout type="game" />
            </div>
          )}
          loadingText="Loading session..."
        >
          <GameLazy />
        </LazyWrapper>
      </AppLayout>
    ),
  },
  {
    path: '/game/:languageCode/:moduleId',
    element: (
      <AppLayout showBottomNav={false}>
        <LazyWrapper 
          fallback={() => (
            <div style={{ padding: '20px' }}>
              <SkeletonLayout type="game" />
            </div>
          )}
          loadingText="Loading module game..."
        >
          <GameLazy />
        </LazyWrapper>
      </AppLayout>
    ),
  },
]);