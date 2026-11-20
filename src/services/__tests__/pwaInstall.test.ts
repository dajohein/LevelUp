import type { BeforeInstallPromptEvent } from '../pwaInstall';

type Manager = typeof import('../pwaInstall').pwaInstallManager;

const loadManager = async (standalone = false): Promise<Manager> => {
  let manager!: Manager;
  window.matchMedia = jest.fn().mockReturnValue({ matches: standalone }) as never;
  await jest.isolateModulesAsync(async () => {
    manager = (await import('../pwaInstall')).pwaInstallManager;
  });
  return manager;
};

const promptEvent = (outcome: 'accepted' | 'dismissed', prompt?: () => Promise<void>) => {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt: prompt ?? jest.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  return event;
};

describe('pwaInstallManager', () => {
  it('captures beforeinstallprompt, suppresses the default prompt and becomes installable', async () => {
    const manager = await loadManager();
    expect(manager.getState()).toEqual({ installable: false, installed: false });

    const event = promptEvent('accepted');
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(manager.getState()).toEqual({ installable: true, installed: false });
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const manager = await loadManager();
    const listener = jest.fn();
    const unsubscribe = manager.subscribe(listener);
    window.dispatchEvent(promptEvent('accepted'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    window.dispatchEvent(promptEvent('accepted'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('prompts once and reports accepted; the used event is discarded', async () => {
    const manager = await loadManager();
    const event = promptEvent('accepted');
    window.dispatchEvent(event);

    await expect(manager.promptInstall()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(manager.getState().installable).toBe(false);
    await expect(manager.promptInstall()).resolves.toBe('unavailable');
  });

  it('reports a cancelled prompt as dismissed', async () => {
    const manager = await loadManager();
    window.dispatchEvent(promptEvent('dismissed'));
    await expect(manager.promptInstall()).resolves.toBe('dismissed');
    expect(manager.getState().installable).toBe(false);
  });

  it('reports a failing prompt() as an error instead of throwing', async () => {
    const manager = await loadManager();
    window.dispatchEvent(
      promptEvent('accepted', () => Promise.reject(new Error('InvalidStateError')))
    );
    await expect(manager.promptInstall()).resolves.toBe('error');
    expect(manager.getState().installable).toBe(false);
  });

  it('is unavailable without a captured event, and never reloads', async () => {
    const manager = await loadManager();
    await expect(manager.promptInstall()).resolves.toBe('unavailable');
  });

  it('starts installed in standalone display mode and is never installable then', async () => {
    const manager = await loadManager(true);
    window.dispatchEvent(promptEvent('accepted'));
    expect(manager.getState()).toEqual({ installable: false, installed: true });
  });

  it('becomes installed on the appinstalled event', async () => {
    const manager = await loadManager();
    window.dispatchEvent(promptEvent('accepted'));
    window.dispatchEvent(new Event('appinstalled'));
    expect(manager.getState()).toEqual({ installable: false, installed: true });
  });
});

describe('getInstallGuidance', () => {
  const { getInstallGuidance } =
    jest.requireActual<typeof import('../pwaInstall')>('../pwaInstall');
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
  const MAC_SAFARI =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
  const MAC_CHROME =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
  const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';

  it('gives Share, Add to Home Screen on iPhone', async () => {
    const guidance = getInstallGuidance(IPHONE, 5);
    expect(guidance.platform).toBe('ios');
    expect(guidance.text).toMatch(/Share.*Add to Home Screen/);
  });

  it('treats a touch-enabled "Macintosh" (iPadOS) as iOS but a plain Mac as not', async () => {
    expect(getInstallGuidance(MAC_SAFARI, 5).platform).toBe('ios');
    expect(getInstallGuidance(MAC_SAFARI, 0).platform).toBe('safari-mac');
  });

  it('does not mistake desktop Chrome or Firefox for Safari', async () => {
    expect(getInstallGuidance(MAC_CHROME, 0).platform).toBe('generic');
    expect(getInstallGuidance(FIREFOX, 0).platform).toBe('generic');
  });
});
