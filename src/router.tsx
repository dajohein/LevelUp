import { createBrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import {
  LanguagesOverview,
  ModuleProgressView,
  LanguageOverview,
  GameLazy,
  UserProfilePageLazy,
  ModuleOverviewLazy,
  SessionSelectLazy,
  SessionCompletionLazy,
} from './utils/lazyComponents';
import { LazyWrapper, GameSkeleton, ModuleSkeleton } from './components/feedback/LoadingSkeleton';

// Wrapper component to pass languageCode and moduleId to SessionSelect
const SessionSelectWrapper = () => {
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId?: string }>();
  return (
    <LazyWrapper fallback={() => <ModuleSkeleton />} loadingText="Loading session options...">
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
    element: <LanguagesOverview />,
  },
  {
    path: '/profile',
    element: (
      <LazyWrapper loadingText="Loading profile...">
        <UserProfilePageLazy />
      </LazyWrapper>
    ),
  },
  {
    path: '/language/:languageCode',
    element: (
      <LazyWrapper fallback={() => <ModuleSkeleton />} loadingText="Loading modules...">
        <ModuleOverviewLazy />
      </LazyWrapper>
    ),
  },
  {
    path: '/language/:languageCode/:moduleId',
    element: <ModuleProgressView />,
  },
  {
    path: '/overview/:language',
    element: <LanguageOverview />,
  },
  {
    path: '/sessions/:languageCode',
    element: <SessionSelectWrapper />,
  },
  {
    path: '/sessions/:languageCode/:moduleId',
    element: <SessionSelectWrapper />,
  },
  {
    path: '/game/:languageCode',
    element: (
      <LazyWrapper fallback={() => <GameSkeleton />} loadingText="Starting game...">
        <GameLazy />
      </LazyWrapper>
    ),
  },
  {
    path: '/game/:languageCode/session',
    element: (
      <LazyWrapper fallback={() => <GameSkeleton />} loadingText="Loading session...">
        <GameLazy />
      </LazyWrapper>
    ),
  },
  {
    path: '/game/:languageCode/:moduleId',
    element: (
      <LazyWrapper fallback={() => <GameSkeleton />} loadingText="Loading module game...">
        <GameLazy />
      </LazyWrapper>
    ),
  },
  {
    path: '/completed/:languageCode',
    element: <SessionCompletionWrapper />,
  },
]);