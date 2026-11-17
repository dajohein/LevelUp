import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';
import { AccountLinking } from '../AccountLinking';
import { theme } from '../../styles/theme';
import { remoteStorage, RemoteSessionError } from '../../services/storage/remoteStorage';
import { environmentConfig } from '../../config/environment';

jest.mock('../../config/environment', () => ({
  environmentConfig: { enableRemoteStorage: false },
}));

jest.mock('../../services/storage/remoteStorage', () => {
  const actual = jest.requireActual('../../services/storage/remoteStorage');
  return {
    RemoteSessionError: actual.RemoteSessionError,
    remoteStorage: {
      getLinkedDevicesCount: jest.fn().mockResolvedValue(1),
      generateAccountCode: jest.fn(),
      resetSession: jest.fn().mockResolvedValue(undefined),
      linkDeviceWithCode: jest.fn(),
    },
  };
});

const mocked = jest.mocked(remoteStorage);
// the mocked config object is mutable so each test can switch remote sync on or off
const mockEnv = environmentConfig as { enableRemoteStorage: boolean };
const renderIt = () =>
  render(
    <ThemeProvider theme={theme}>
      <AccountLinking />
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.enableRemoteStorage = false;
});

describe('AccountLinking', () => {
  it('explains local-only progress, disables remote actions, and skips the session check', () => {
    renderIt();

    expect(screen.getByText(/Progress is saved on this device only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Account Code' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Link This Device' })).toBeDisabled();
    expect(remoteStorage.getLinkedDevicesCount).not.toHaveBeenCalled();
  });

  describe('with remote sync enabled', () => {
    beforeEach(() => {
      mockEnv.enableRemoteStorage = true;
    });

    it('shows the generated code', async () => {
      mocked.generateAccountCode.mockResolvedValue({
        code: 'ABCD2345',
        expires: Date.now() + 3_600_000,
      });
      renderIt();
      await userEvent.click(screen.getByRole('button', { name: 'Generate Account Code' }));
      expect(await screen.findByText('ABCD2345')).toBeInTheDocument();
    });

    it('explains a lost session and offers a reset instead of a generic failure', async () => {
      mocked.generateAccountCode.mockRejectedValueOnce(new RemoteSessionError());
      renderIt();
      await userEvent.click(screen.getByRole('button', { name: 'Generate Account Code' }));

      expect(await screen.findByText(/saved sync session is no longer valid/)).toBeInTheDocument();
      expect(screen.getByText(/progress on this device is safe/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Reset sync session and try again' })
      ).toBeInTheDocument();
      expect(mocked.resetSession).not.toHaveBeenCalled(); // never automatic
    });

    it('resetting starts a new session and retries the code in one step', async () => {
      mocked.generateAccountCode
        .mockRejectedValueOnce(new RemoteSessionError())
        .mockResolvedValueOnce({ code: 'WXYZ6789', expires: Date.now() + 3_600_000 });
      renderIt();
      await userEvent.click(screen.getByRole('button', { name: 'Generate Account Code' }));
      await userEvent.click(
        await screen.findByRole('button', { name: 'Reset sync session and try again' })
      );

      expect(await screen.findByText('WXYZ6789')).toBeInTheDocument();
      expect(mocked.resetSession).toHaveBeenCalledTimes(1);
      expect(mocked.generateAccountCode).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('button', { name: /Reset sync session/ })).not.toBeInTheDocument();
    });

    it('does not offer a reset for a network problem, and says so', async () => {
      mocked.generateAccountCode.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderIt();
      await userEvent.click(screen.getByRole('button', { name: 'Generate Account Code' }));

      expect(await screen.findByText(/Could not reach the sync server/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reset sync session/ })).not.toBeInTheDocument();
    });

    it('keeps the generic message for other failures', async () => {
      mocked.generateAccountCode.mockRejectedValueOnce(
        new Error('HTTP 500: Internal Server Error')
      );
      renderIt();
      await userEvent.click(screen.getByRole('button', { name: 'Generate Account Code' }));

      await waitFor(() =>
        expect(
          screen.getByText('Failed to generate account code. Please try again.')
        ).toBeInTheDocument()
      );
      expect(screen.queryByRole('button', { name: /Reset sync session/ })).not.toBeInTheDocument();
    });
  });
});
