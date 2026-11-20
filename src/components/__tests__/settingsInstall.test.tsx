import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';
import { theme } from '../../styles/theme';
import { useInstallPrompt } from '../../hooks/usePWA';

jest.mock('../Navigation', () => ({ Navigation: () => null }));
jest.mock('../AccountLinking', () => ({ AccountLinking: () => null }));
jest.mock('../../services/pwaUpdateManager', () => ({
  pwaUpdateManager: { getPendingUpdate: () => null },
}));
jest.mock('../../hooks/usePWA', () => ({ useInstallPrompt: jest.fn() }));

const mockHook = jest.mocked(useInstallPrompt);

const setState = (
  state: { isInstallable: boolean; isInstalled: boolean },
  installApp = jest.fn()
) => {
  mockHook.mockReturnValue({ ...state, installApp });
  return installApp;
};

const renderSettings = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SettingsPage />
      </MemoryRouter>
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Settings: Install as App', () => {
  it('invokes the install prompt', async () => {
    const installApp = setState(
      { isInstallable: true, isInstalled: false },
      jest.fn().mockResolvedValue('accepted')
    );
    renderSettings();

    await userEvent.click(screen.getByRole('button', { name: 'Install as App' }));

    expect(installApp).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when the user cancels the prompt', async () => {
    setState({ isInstallable: true, isInstalled: false }, jest.fn().mockResolvedValue('dismissed'));
    renderSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Install as App' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Installation was cancelled');
  });

  it('shows an error when installation fails', async () => {
    setState({ isInstallable: true, isInstalled: false }, jest.fn().mockResolvedValue('error'));
    renderSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Install as App' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Installation could not be started');
  });

  it('offers no install button once installed', () => {
    setState({ isInstallable: false, isInstalled: true });
    renderSettings();
    expect(screen.queryByRole('button', { name: 'Install as App' })).toBeNull();
    expect(screen.getByText(/installed as an app/)).toBeInTheDocument();
  });

  it('explains how to install where no prompt is available', () => {
    setState({ isInstallable: false, isInstalled: false });
    renderSettings();
    expect(screen.queryByRole('button', { name: 'Install as App' })).toBeNull();
    expect(screen.getByText(/Install app|Add to Home|Add to Dock/)).toBeInTheDocument();
  });
});
