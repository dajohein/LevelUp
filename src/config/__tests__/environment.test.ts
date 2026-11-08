describe('environment configuration', () => {
  const runtimeWindow = window as Window & {
    __APP_ENV?: Record<string, string | undefined>;
  };
  let originalAppEnv: Record<string, string | undefined> | undefined;

  beforeEach(() => {
    originalAppEnv = runtimeWindow.__APP_ENV;
    delete runtimeWindow.__APP_ENV;
    jest.resetModules();
  });

  afterEach(() => {
    if (originalAppEnv) {
      runtimeWindow.__APP_ENV = originalAppEnv;
    } else {
      delete runtimeWindow.__APP_ENV;
    }
  });

  it('reads Vite configuration initialized after importing consumers', async () => {
    const { environmentConfig } = await import('../environment');
    runtimeWindow.__APP_ENV = {
      VITE_ENABLE_REMOTE_STORAGE: 'true',
      VITE_API_BASE_URL: 'https://demo.example.test',
    };

    expect(environmentConfig.enableRemoteStorage).toBe(true);
    expect(environmentConfig.apiBaseUrl).toBe('https://demo.example.test');
  });
});
