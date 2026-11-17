import { PROGRESS_KEY } from '../progressSync';

const mockEnv = { enableRemoteStorage: true };
const mockRemote = { hasSession: jest.fn(), deleteValue: jest.fn() };

jest.mock('../../../config/environment', () => ({
  environmentConfig: new Proxy(
    {},
    { get: (_t, key) => (mockEnv as Record<string, unknown>)[key as string] }
  ),
}));
jest.mock('../../storage/remoteStorage', () => ({ remoteStorage: mockRemote }));

import { isProgressSyncActive, resetRemoteProgress } from '../resetRemoteProgress';

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.enableRemoteStorage = true;
  mockRemote.hasSession.mockReturnValue(true);
  mockRemote.deleteValue.mockResolvedValue(undefined);
});

describe('isProgressSyncActive', () => {
  it('needs both the flag and a session', () => {
    expect(isProgressSyncActive()).toBe(true);
    mockRemote.hasSession.mockReturnValue(false);
    expect(isProgressSyncActive()).toBe(false);
    mockRemote.hasSession.mockReturnValue(true);
    mockEnv.enableRemoteStorage = false;
    expect(isProgressSyncActive()).toBe(false);
  });
});

describe('resetRemoteProgress', () => {
  it('deletes the progress entry of each language, and only that key', async () => {
    await resetRemoteProgress(['es', 'de']);
    expect(mockRemote.deleteValue.mock.calls).toEqual([
      ['es', PROGRESS_KEY],
      ['de', PROGRESS_KEY],
    ]);
  });

  it('does nothing when sync is off or there is no session', async () => {
    mockEnv.enableRemoteStorage = false;
    await resetRemoteProgress(['es']);
    mockEnv.enableRemoteStorage = true;
    mockRemote.hasSession.mockReturnValue(false);
    await resetRemoteProgress(['es']);
    expect(mockRemote.deleteValue).not.toHaveBeenCalled();
  });

  it('throws when the server cannot confirm, and stops at the failing language', async () => {
    mockRemote.deleteValue
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offline'));
    await expect(resetRemoteProgress(['es', 'de', 'fr'])).rejects.toThrow('offline');
    expect(mockRemote.deleteValue).toHaveBeenCalledTimes(2);
  });
});
