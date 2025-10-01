import { createBrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import { LanguagesOverview } from './components/LanguagesOverview';
import { ModuleOverview } from './components/ModuleOverview';
import { ModuleProgressView } from './components/ModuleProgressView';
import { LanguageOverview } from './components/LanguageOverview';
import { SessionSelect } from './components/SessionSelect';
import { SessionCompletion } from './components/SessionCompletion';
import { Game } from './components/Game';
import { UserProfilePage } from './components/UserProfilePage';

// Wrapper component to pass languageCode and moduleId to SessionSelect
const SessionSelectWrapper = () => {
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId?: string }>();
  return <SessionSelect languageCode={languageCode || ''} moduleId={moduleId} />;
};

// Wrapper component to pass languageCode and moduleId to SessionCompletion
const SessionCompletionWrapper = () => {
  const { languageCode } = useParams<{ languageCode: string }>();
  const moduleId = useSelector((state: RootState) => state.game.module);
  return <SessionCompletion languageCode={languageCode || ''} moduleId={moduleId || undefined} />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LanguagesOverview />,
  },
  {
    path: '/profile',
    element: <UserProfilePage />,
  },
  {
    path: '/language/:languageCode',
    element: <ModuleOverview />,
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
    element: <Game />,
  },
  {
    path: '/game/:languageCode/session',
    element: <Game />,
  },
  {
    path: '/game/:languageCode/:moduleId',
    element: <Game />,
  },
  {
    path: '/session-complete/:languageCode',
    element: <SessionCompletionWrapper />,
  },
]);
