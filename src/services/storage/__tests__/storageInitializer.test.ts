import { remoteStorage } from '../remoteStorage';
import { storageInitializer } from '../storageInitializer';

jest.mock('../remoteStorage', () => ({
  remoteStorage: {
    getUserSession: jest.fn(),
    initializeUser: jest.fn(),
    healthCheck: jest.fn(),
  },
}));
jest.mock('../enhancedStorage', () => ({
  enhancedStorage: {
    getStorageAnalytics: jest.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));
jest.mock('../../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('storage initialization session recovery', () => {
  const runtimeWindow = window as Window & {
    __APP_ENV?: Record<string, string | undefined>;
  };
  let originalAppEnv: Record<string, string | undefined> | undefined;

  beforeEach(async () => {
    originalAppEnv = runtimeWindow.__APP_ENV;
    runtimeWindow.__APP_ENV = {
      VITE_ENABLE_REMOTE_STORAGE: 'true',
      VITE_ENABLE_LOCAL_FALLBACK: 'true',
    };
    await storageInitializer.shutdown();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await storageInitializer.shutdown();
    if (originalAppEnv) {
      runtimeWindow.__APP_ENV = originalAppEnv;
    } else {
      delete runtimeWindow.__APP_ENV;
    }
  });

  it('restores an existing remote session instead of unconditionally creating a guest', async () => {
    jest
      .mocked(remoteStorage.getUserSession)
      .mockRejectedValue(new Error('Stored session expired'));

    await storageInitializer.initialize();

    expect(remoteStorage.getUserSession).toHaveBeenCalledTimes(1);
    expect(remoteStorage.initializeUser).not.toHaveBeenCalled();
    await expect(storageInitializer.getStatus()).resolves.toMatchObject({ remoteEnabled: false });
  });
});
