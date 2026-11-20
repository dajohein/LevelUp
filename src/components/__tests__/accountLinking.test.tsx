import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';
import { AccountLinking } from '../AccountLinking';
import { theme } from '../../styles/theme';
import {
  remoteStorage,
  RemoteNetworkError,
  RemoteSessionError,
} from '../../services/storage/remoteStorage';
import { environmentConfig } from '../../config/environment';
import { syncActiveLanguageProgress } from '../../services/progressSync/startProgressSync';
import { logger } from '../../services/logger';

jest.mock('../../services/progressSync/startProgressSync', () => ({
  syncActiveLanguageProgress: jest.fn(),
}));
jest.mock('../../services/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/environment', () => ({
  environmentConfig: { enableRemoteStorage: false },
}));
jest.mock('../../services/storage/remoteStorage', () => {
  const actual = jest.requireActual('../../services/storage/remoteStorage');
  return {
    RemoteSessionError: actual.RemoteSessionError,
    RemoteNetworkError: actual.RemoteNetworkError,
    remoteStorage: {
      getLinkedDevicesCount: jest.fn().mockResolvedValue(1),
      generateAccountCode: jest.fn(),
      resetSession: jest.fn().mockResolvedValue(undefined),
      linkDeviceWithCode: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      revokeSessions: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const mocked = jest.mocked(remoteStorage);
// the mocked config object is mutable so each test can switch remote sync on or off
const mockEnv = environmentConfig as { enableRemoteStorage: boolean };
const code = (value: string) => ({ code: value, expires: Date.now() + 3_600_000 });
const generate = () => screen.getByRole('button', { name: 'Generate Account Code' });
const resetButton = () => screen.queryByRole('button', { name: /Reset sync session/ });

const renderIt = () =>
  render(
    <ThemeProvider theme={theme}>
      <AccountLinking />
    </ThemeProvider>
  );

/** A promise the test resolves or rejects by hand, to observe the UI mid-request. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.resetSession.mockResolvedValue(undefined);
  mockEnv.enableRemoteStorage = false;
});

describe('AccountLinking', () => {
  it('explains local-only progress, disables remote actions, and skips the session check', () => {
    renderIt();

    expect(screen.getByText(/Progress is saved on this device only/)).toBeInTheDocument();
    expect(generate()).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Link This Device' })).toBeDisabled();
    expect(remoteStorage.getLinkedDevicesCount).not.toHaveBeenCalled();
  });

  describe('with remote sync enabled', () => {
    beforeEach(() => {
      mockEnv.enableRemoteStorage = true;
    });

    it('shows the generated code', async () => {
      mocked.generateAccountCode.mockResolvedValue(code('ABCD2345'));
      renderIt();
      await userEvent.click(generate());
      expect(await screen.findByText('ABCD2345')).toBeInTheDocument();
    });

    describe('a lost session', () => {
      it('is explained, with a reset offered instead of a generic failure', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(new RemoteSessionError());
        renderIt();
        await userEvent.click(generate());

        expect(
          await screen.findByText(/saved sync session is no longer valid/)
        ).toBeInTheDocument();
        expect(screen.getByText(/progress on this device is safe/)).toBeInTheDocument();
        expect(resetButton()).toBeInTheDocument();
        expect(mocked.resetSession).not.toHaveBeenCalled(); // never automatic
      });

      it('is announced to screen readers', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(new RemoteSessionError());
        renderIt();
        await userEvent.click(generate());
        expect(await screen.findByRole('alert')).toHaveTextContent(/no longer valid/);
      });

      it('resetting starts a new session and retries the code in one step, in that order', async () => {
        const order: string[] = [];
        mocked.generateAccountCode
          .mockRejectedValueOnce(new RemoteSessionError())
          .mockImplementationOnce(async () => {
            order.push('generate');
            return code('WXYZ6789');
          });
        mocked.resetSession.mockImplementation(async () => {
          order.push('reset');
        });
        renderIt();
        await userEvent.click(generate());
        await userEvent.click(await screen.findByRole('button', { name: /Reset sync session/ }));

        expect(await screen.findByText('WXYZ6789')).toBeInTheDocument();
        expect(order).toEqual(['reset', 'generate']);
        expect(mocked.generateAccountCode).toHaveBeenCalledTimes(2);
        expect(resetButton()).not.toBeInTheDocument();
      });

      it('keeps the reset button on screen, busy, while the retry runs', async () => {
        const retry = deferred<{ code: string; expires: number }>();
        mocked.generateAccountCode
          .mockRejectedValueOnce(new RemoteSessionError())
          .mockReturnValueOnce(retry.promise);
        renderIt();
        await userEvent.click(generate());
        await userEvent.click(await screen.findByRole('button', { name: /Reset sync session/ }));

        // mid-request: the button the user pressed is still there (focus is not dropped) and busy
        await waitFor(() => expect(mocked.generateAccountCode).toHaveBeenCalledTimes(2));
        const busy = screen.getByRole('button', { name: /Resetting/ });
        expect(busy).toBeInTheDocument();
        expect(busy).toBeDisabled();

        retry.resolve(code('LATE2345'));
        expect(await screen.findByText('LATE2345')).toBeInTheDocument();
        expect(resetButton()).not.toBeInTheDocument();
      });

      it('a double tap resets and generates once', async () => {
        const reset = deferred<void>();
        mocked.generateAccountCode
          .mockRejectedValueOnce(new RemoteSessionError())
          .mockResolvedValueOnce(code('ONCE2345'));
        mocked.resetSession.mockReturnValueOnce(reset.promise);
        renderIt();
        await userEvent.click(generate());
        const button = await screen.findByRole('button', { name: /Reset sync session/ });
        await userEvent.click(button);
        await userEvent.click(button);
        reset.resolve();

        expect(await screen.findByText('ONCE2345')).toBeInTheDocument();
        expect(mocked.resetSession).toHaveBeenCalledTimes(1);
        expect(mocked.generateAccountCode).toHaveBeenCalledTimes(2);
      });

      it('a failing reset says so instead of failing silently', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(new RemoteSessionError());
        mocked.resetSession.mockRejectedValueOnce(new Error('storage blocked'));
        renderIt();
        await userEvent.click(generate());
        await userEvent.click(await screen.findByRole('button', { name: /Reset sync session/ }));

        expect(await screen.findByText(/Could not reset the sync session/)).toBeInTheDocument();
        expect(mocked.generateAccountCode).toHaveBeenCalledTimes(1); // no retry after a failed reset
        expect(resetButton()).toBeEnabled(); // and the user can try again
      });

      it('a reset that then fails again for another reason is reported honestly, with no stale button', async () => {
        mocked.generateAccountCode
          .mockRejectedValueOnce(new RemoteSessionError())
          .mockRejectedValueOnce(new RemoteNetworkError());
        renderIt();
        await userEvent.click(generate());
        await userEvent.click(await screen.findByRole('button', { name: /Reset sync session/ }));

        expect(await screen.findByText(/Could not reach the sync server/)).toBeInTheDocument();
        expect(resetButton()).not.toBeInTheDocument();
      });

      it('a reset that is refused again keeps the explanation and the button', async () => {
        mocked.generateAccountCode.mockRejectedValue(new RemoteSessionError());
        renderIt();
        await userEvent.click(generate());
        await userEvent.click(await screen.findByRole('button', { name: /Reset sync session/ }));

        expect(await screen.findByText(/no longer valid/)).toBeInTheDocument();
        expect(resetButton()).toBeInTheDocument();
      });

      it('linking a device clears the reset button, so it is never left without a message', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(new RemoteSessionError());
        mocked.linkDeviceWithCode.mockResolvedValue({ success: true, linkedDevices: 2 });
        renderIt();
        await userEvent.click(generate());
        expect(
          await screen.findByRole('button', { name: /Reset sync session/ })
        ).toBeInTheDocument();

        await userEvent.type(screen.getByRole('textbox'), 'ABCD2345');
        await userEvent.click(screen.getByRole('button', { name: 'Link This Device' }));

        expect(await screen.findByText(/Device linked to your account/)).toBeInTheDocument();
        expect(resetButton()).not.toBeInTheDocument();
      });
    });

    describe('other failures', () => {
      it('a network problem is named as such and offers no reset', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(new RemoteNetworkError('timed out'));
        renderIt();
        await userEvent.click(generate());

        expect(await screen.findByText(/Could not reach the sync server/)).toBeInTheDocument();
        expect(resetButton()).not.toBeInTheDocument();
      });

      it('being offline is named as such even if the error is plain', async () => {
        const online = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        try {
          mocked.generateAccountCode.mockRejectedValueOnce(new Error('whatever'));
          renderIt();
          await userEvent.click(generate());
          expect(await screen.findByText(/Could not reach the sync server/)).toBeInTheDocument();
        } finally {
          online.mockRestore();
        }
      });

      it('a programming error is not blamed on the network', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(
          new TypeError("Cannot read properties of undefined (reading 'expiresIn')")
        );
        renderIt();
        await userEvent.click(generate());

        await waitFor(() =>
          expect(
            screen.getByText('Failed to generate account code. Please try again.')
          ).toBeInTheDocument()
        );
        expect(screen.queryByText(/Could not reach the sync server/)).not.toBeInTheDocument();
        expect(resetButton()).not.toBeInTheDocument();
      });

      it('keeps the generic message for a server error', async () => {
        mocked.generateAccountCode.mockRejectedValueOnce(
          new Error('HTTP 500: Internal Server Error')
        );
        renderIt();
        await userEvent.click(generate());

        expect(
          await screen.findByText('Failed to generate account code. Please try again.')
        ).toBeInTheDocument();
        expect(resetButton()).not.toBeInTheDocument();
      });
    });

    describe('linking', () => {
      it('does not print "undefined" when the server gives no device count', async () => {
        mocked.linkDeviceWithCode.mockResolvedValue({
          success: true,
          linkedDevices: undefined as unknown as number,
        });
        renderIt();
        await userEvent.type(screen.getByRole('textbox'), 'ABCD2345');
        await userEvent.click(screen.getByRole('button', { name: 'Link This Device' }));

        const status = await screen.findByRole('status');
        expect(status).toHaveTextContent('Device linked to your account.');
        expect(status).not.toHaveTextContent('undefined');
      });

      const link = async () => {
        mocked.linkDeviceWithCode.mockResolvedValue({ success: true, linkedDevices: 2 });
        renderIt();
        await userEvent.type(screen.getByRole('textbox'), 'ABCD2345');
        await userEvent.click(screen.getByRole('button', { name: 'Link This Device' }));
        return screen.findByRole('status');
      };

      it.each(['uploaded', 'merged', 'unchanged'] as const)(
        'says progress was synced when the sync ends as "%s"',
        async outcome => {
          jest
            .mocked(syncActiveLanguageProgress)
            .mockResolvedValue({ status: outcome, takenFromRemote: 0, uploaded: false });
          const status = await link();
          expect(status).toHaveTextContent('Your progress for the current language was synced');
          expect(status).toHaveTextContent('Total devices: 2');
          expect(syncActiveLanguageProgress).toHaveBeenCalledTimes(1);
        }
      );

      it.each(['failed', 'skipped'] as const)(
        'does not claim a sync when it ends as "%s"; the link itself still succeeded',
        async outcome => {
          jest
            .mocked(syncActiveLanguageProgress)
            .mockResolvedValue({ status: outcome, takenFromRemote: 0, uploaded: false });
          const status = await link();
          expect(status).toHaveTextContent('Device linked to your account.');
          expect(status).toHaveTextContent(
            'Your progress could not be synced right now; it stays on this device.'
          );
          expect(status).not.toHaveTextContent('syncs again later');
          expect(status).not.toHaveTextContent('was synced');
        }
      );

      it('does not claim a sync when the sync itself throws, and still reports the link', async () => {
        jest.mocked(syncActiveLanguageProgress).mockRejectedValue(new Error('boom'));
        const status = await link();
        expect(status).toHaveTextContent('Device linked to your account.');
        expect(status).toHaveTextContent(
          'Your progress could not be synced right now; it stays on this device.'
        );
        expect(status).not.toHaveTextContent('was synced');
      });

      it('logs a warning with only the error name when the sync throws', async () => {
        jest
          .mocked(syncActiveLanguageProgress)
          .mockRejectedValue(new TypeError('secret detail boom'));
        await link();
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith('Progress sync after linking failed', {
          error: 'TypeError',
        });
        expect(JSON.stringify(jest.mocked(logger.warn).mock.calls)).not.toContain('secret detail');
      });

      it('logs no warning when the sync merely ends as failed or skipped', async () => {
        jest
          .mocked(syncActiveLanguageProgress)
          .mockResolvedValue({ status: 'failed', takenFromRemote: 0, uploaded: false });
        await link();
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('does not sync when linking fails', async () => {
        mocked.linkDeviceWithCode.mockRejectedValue(new Error('bad code'));
        renderIt();
        await userEvent.type(screen.getByRole('textbox'), 'ABCD2345');
        await userEvent.click(screen.getByRole('button', { name: 'Link This Device' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Failed to link device');
        expect(syncActiveLanguageProgress).not.toHaveBeenCalled();
      });
    });

    describe('session logout and revocation', () => {
      it('logs out on this device and confirms local progress is preserved', async () => {
        renderIt();
        const logoutBtn = screen.getByRole('button', { name: 'Log Out on This Device' });
        await userEvent.click(logoutBtn);

        expect(mocked.logout).toHaveBeenCalledTimes(1);
        expect(
          await screen.findByText(
            /Logged out on this device. Your local progress has been preserved./
          )
        ).toBeInTheDocument();
      });

      it('revokes all sessions everywhere and confirms revocation', async () => {
        renderIt();
        const revokeBtn = screen.getByRole('button', {
          name: 'Sign Out Everywhere (Revoke All Sessions)',
        });
        await userEvent.click(revokeBtn);

        expect(mocked.revokeSessions).toHaveBeenCalledTimes(1);
        expect(
          await screen.findByText(/Signed out everywhere. All active sessions have been revoked/)
        ).toBeInTheDocument();
      });

      it('handles revoke failure gracefully', async () => {
        mocked.revokeSessions.mockRejectedValueOnce(new Error('Network error'));
        renderIt();
        const revokeBtn = screen.getByRole('button', {
          name: 'Sign Out Everywhere (Revoke All Sessions)',
        });
        await userEvent.click(revokeBtn);

        expect(
          await screen.findByText(/Failed to revoke all sessions on the server/)
        ).toBeInTheDocument();
      });
    });
  });
});
