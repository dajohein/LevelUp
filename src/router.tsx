import { createBrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { LanguageSelect } from './components/LanguageSelect';
import { SessionSelect } from './components/SessionSelect';
import { SessionCompletion } from './components/SessionCompletion';
import { Game } from './components/Game';

const languages = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

// Wrapper component to pass languageCode to SessionSelect
const SessionSelectWrapper = () => {
  const { languageCode } = useParams<{ languageCode: string }>();
  return <SessionSelect languageCode={languageCode || ''} />;
};

// Wrapper component to pass languageCode to SessionCompletion
const SessionCompletionWrapper = () => {
  const { languageCode } = useParams<{ languageCode: string }>();
  return <SessionCompletion languageCode={languageCode || ''} />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LanguageSelect languages={languages} />,
  },
  {
    path: '/sessions/:languageCode',
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
    path: '/session-complete/:languageCode',
    element: <SessionCompletionWrapper />,
  },
]);
