import { act, renderHook } from '@testing-library/react';
import { usePWA } from '../usePWA';
import { pwaUpdateManager, UpdateInfo } from '../../services/pwaUpdateManager';

jest.mock('../../services/pwaUpdateManager', () => ({
  pwaUpdateManager: { onUpdateAvailable: jest.fn(), applyUpdate: jest.fn() },
}));

const manager = jest.mocked(pwaUpdateManager);
const update: UpdateInfo = { version: '1', cacheIdentifier: 'x', available: true };
let subscribers: Array<(info: UpdateInfo) => void>;
let unsubscribed: number;

beforeEach(() => {
  jest.clearAllMocks();
  subscribers = [];
  unsubscribed = 0;
  manager.onUpdateAvailable.mockImplementation(callback => {
    subscribers.push(callback);
    return () => {
      unsubscribed += 1;
    };
  });
  manager.applyUpdate.mockResolvedValue(true);
});

describe('usePWA update state', () => {
  it('reports an update through the manager, the single detector', () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.updateAvailable).toBe(false);

    act(() => subscribers.forEach(callback => callback(update)));

    expect(result.current.updateAvailable).toBe(true);
  });

  it('also reports an update that was already waiting at startup (the manager replays it)', () => {
    manager.onUpdateAvailable.mockImplementation(callback => {
      callback(update);
      return () => undefined;
    });
    const { result } = renderHook(() => usePWA());
    expect(result.current.updateAvailable).toBe(true);
  });

  it('updateApp asks the manager (which waits for the worker and reloads once)', async () => {
    const { result } = renderHook(() => usePWA());
    await act(async () => {
      await result.current.updateApp();
    });
    expect(manager.applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('stops listening when the component unmounts', () => {
    const { unmount } = renderHook(() => usePWA());
    unmount();
    expect(unsubscribed).toBe(1);
  });
});
