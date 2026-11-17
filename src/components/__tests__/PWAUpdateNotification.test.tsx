import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { PWAUpdateNotification } from '../PWAUpdateNotification';
import { pwaUpdateManager, UpdateInfo } from '../../services/pwaUpdateManager';
import { reloadPage } from '../../services/pageReload';

jest.mock('../../services/pageReload', () => ({ reloadPage: jest.fn() }));
jest.mock('../../services/pwaUpdateManager', () => ({
  pwaUpdateManager: { onUpdateAvailable: jest.fn(), applyUpdate: jest.fn() },
}));

const manager = jest.mocked(pwaUpdateManager);
const update: UpdateInfo = { version: '2.1.0', cacheIdentifier: 'x', available: true };

let subscribers: Array<(info: UpdateInfo) => void>;
let unsubscribed: number;

/** Announce an update to everyone still subscribed, as the manager would. */
const announce = (info: UpdateInfo = update) =>
  act(() => {
    subscribers.forEach(callback => callback(info));
  });

function Nav() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/game/de')}>start quiz</button>
      <button onClick={() => navigate('/')}>go home</button>
      <button onClick={() => navigate('/settings')}>go settings</button>
    </>
  );
}

const renderAt = (path = '/') =>
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <PWAUpdateNotification />
      <Nav />
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  subscribers = [];
  unsubscribed = 0;
  manager.onUpdateAvailable.mockImplementation(callback => {
    subscribers.push(callback);
    return () => {
      unsubscribed += 1;
      subscribers = subscribers.filter(existing => existing !== callback);
    };
  });
  manager.applyUpdate.mockResolvedValue(true);
});

describe('PWAUpdateNotification', () => {
  it('shows nothing until an update is announced', () => {
    renderAt();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces a new version politely, with a way to update and a way to postpone', () => {
    renderAt();
    announce();

    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveTextContent('A new version of LevelUp is ready.');
    expect(banner).toHaveTextContent('v2.1.0');
    expect(screen.getByRole('button', { name: /Update now/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Later' })).toBeEnabled();
  });

  it('does not show a stale, hard-coded release note', () => {
    renderAt();
    announce();
    expect(screen.getByRole('status')).not.toHaveTextContent(/Boss battles/);
  });

  it('leaves out an unknown version number', () => {
    renderAt();
    announce({ ...update, version: 'unknown' });
    expect(screen.getByRole('status')).not.toHaveTextContent('vunknown');
  });

  it('is shown at once when the update was found before the page mounted (replay)', () => {
    manager.onUpdateAvailable.mockImplementation(callback => {
      callback(update); // what the manager does for a late subscriber
      return () => undefined;
    });
    renderAt();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  describe('it stays until the user decides', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('does not dismiss itself (it used to vanish after 15 seconds)', () => {
      renderAt();
      announce();
      act(() => jest.advanceTimersByTime(10 * 60 * 1000));
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(localStorage.getItem('pending-update')).toBeNull();
    });
  });

  describe('subscriptions', () => {
    it('subscribes once, however often the route changes, and ends it on unmount', async () => {
      const user = userEvent.setup();
      const { unmount } = renderAt();
      await user.click(screen.getByRole('button', { name: 'go settings' }));
      await user.click(screen.getByRole('button', { name: 'go home' }));
      await user.click(screen.getByRole('button', { name: 'go settings' }));

      expect(manager.onUpdateAvailable).toHaveBeenCalledTimes(1);
      expect(subscribers).toHaveLength(1);

      unmount();
      expect(unsubscribed).toBe(1);
      expect(subscribers).toHaveLength(0);
    });
  });

  describe('during a quiz', () => {
    it('is not offered while a quiz is in progress, and appears when the learner leaves it', async () => {
      const user = userEvent.setup();
      renderAt('/game/de');
      announce();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'go home' }));
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('is withdrawn again if the learner starts another quiz, and never applies by itself', async () => {
      const user = userEvent.setup();
      renderAt('/');
      announce();
      expect(screen.getByRole('status')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'start quiz' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(manager.applyUpdate).not.toHaveBeenCalled();
      expect(reloadPage).not.toHaveBeenCalled();
    });
  });

  describe('updating', () => {
    it('applies the update on request and shows progress', async () => {
      const user = userEvent.setup();
      renderAt();
      announce();
      await user.click(screen.getByRole('button', { name: /Update now/ }));

      expect(manager.applyUpdate).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: /Updating/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Later' })).toBeDisabled();
      expect(reloadPage).not.toHaveBeenCalled(); // the manager reloads, once, when ready
    });

    it('falls back to a plain reload when the update could not be applied through the worker', async () => {
      manager.applyUpdate.mockResolvedValue(false);
      const user = userEvent.setup();
      renderAt();
      announce();
      await user.click(screen.getByRole('button', { name: /Update now/ }));
      expect(reloadPage).toHaveBeenCalledTimes(1);
    });

    it('lets the user try again if applying throws', async () => {
      manager.applyUpdate.mockRejectedValue(new Error('boom'));
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const user = userEvent.setup();
      renderAt();
      announce();
      await user.click(screen.getByRole('button', { name: /Update now/ }));

      expect(await screen.findByRole('button', { name: /Update now/ })).toBeEnabled();
      error.mockRestore();
    });
  });

  describe('postponing', () => {
    it('Later hides the banner, remembers the update for Settings, and it stays hidden', async () => {
      const user = userEvent.setup();
      renderAt();
      announce();
      await user.click(screen.getByRole('button', { name: 'Later' }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('pending-update') as string)).toMatchObject({
        version: '2.1.0',
      });

      await user.click(screen.getByRole('button', { name: 'go settings' }));
      await user.click(screen.getByRole('button', { name: 'go home' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('Later still works when storage is blocked', async () => {
      const blocked = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      const user = userEvent.setup();
      renderAt();
      announce();
      await user.click(screen.getByRole('button', { name: 'Later' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      blocked.mockRestore();
    });
  });
});
