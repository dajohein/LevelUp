import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguagesOverview } from '../LanguagesOverview';
import { theme } from '../../styles/theme';
import { DataMigrationService } from '../../services/dataMigrationService';

jest.mock('../Navigation', () => ({ Navigation: () => null }));
jest.mock('../../services/moduleService', () => ({
  getAvailableLanguages: () => [
    { code: 'es', info: { name: 'Spanish', from: 'Dutch', flag: '🇪🇸', modules: [] } },
  ],
  getModulesForLanguage: () => [
    {
      id: 'm1',
      words: [
        { id: 'es:a', term: 'a', definition: 'a' },
        { id: 'es:b', term: 'b', definition: 'b' },
        { id: 'es:c', term: 'c', definition: 'c' },
      ],
    },
    // Shared with m1: must be counted once
    { id: 'm2', words: [{ id: 'es:a', term: 'a', definition: 'a' }] },
  ],
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: { safeLoadWordProgress: jest.fn() },
}));

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const progress = (id: string, lastPracticed: string) => ({
  wordId: id,
  xp: 30,
  lastPracticed,
  timesCorrect: 2,
  timesIncorrect: 0,
  consecutiveCorrect: 1,
});

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LanguagesOverview />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('LanguagesOverview due words', () => {
  it('shows how many words are due, counting shared words once and skipping fresh ones', () => {
    (DataMigrationService.safeLoadWordProgress as jest.Mock).mockReturnValue({
      'es:a': progress('es:a', hoursAgo(2000)),
      'es:b': progress('es:b', hoursAgo(1500)),
      'es:c': progress('es:c', hoursAgo(0)),
    });
    renderPage();

    expect(screen.getByText('🔄 2 due for review')).toBeInTheDocument();
    expect(screen.getByText(/2 words due for review/)).toBeInTheDocument();
  });

  it('shows nothing about reviews when nothing is due', () => {
    (DataMigrationService.safeLoadWordProgress as jest.Mock).mockReturnValue({
      'es:c': progress('es:c', hoursAgo(0)),
    });
    renderPage();

    expect(screen.queryByText(/due for review/)).not.toBeInTheDocument();
  });
});
