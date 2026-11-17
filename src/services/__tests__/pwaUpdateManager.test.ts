import type { UpdateInfo } from '../pwaUpdateManager';

const reloadPage = jest.fn();
jest.mock('../pageReload', () => ({ reloadPage: () => reloadPage() }));
jest.mock('../logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/** A worker whose state the test moves along: installing -> installed -> activated. */
class FakeWorker extends EventTarget {
  state = 'installing';
  postMessage = jest.fn();
  setState(state: string) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  scope = '/';
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  update = jest.fn().mockResolvedValue(undefined);
  /** Start installing a new worker, the way the browser does when /sw.js changed. */
  foundUpdate(): FakeWorker {
    const worker = new FakeWorker();
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
    return worker;
  }
}

class FakeContainer extends EventTarget {
  controller: object | null = {};
  registration = new FakeRegistration();
  register = jest.fn(async () => this.registration);
  getRegistration = jest.fn(async () => this.registration);
}

/** Load a fresh manager (it is a singleton that wires itself up on import and on `load`). */
async function setup(configure: (container: FakeContainer) => void = () => undefined) {
  const container = new FakeContainer();
  configure(container);
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });

  let manager!: typeof import('../pwaUpdateManager').pwaUpdateManager;
  await jest.isolateModulesAsync(async () => {
    manager = (await import('../pwaUpdateManager')).pwaUpdateManager;
  });
  window.dispatchEvent(new Event('load'));
  await Promise.resolve();
  await Promise.resolve();
  return { manager, container, registration: container.registration };
}

beforeEach(() => {
  reloadPage.mockClear();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('finding an update', () => {
  it('reports a new worker that finished installing while a page is controlled', async () => {
    const { manager, registration } = await setup();
    const seen: UpdateInfo[] = [];
    manager.onUpdateAvailable(info => seen.push(info));

    registration.foundUpdate().setState('installed');

    expect(seen).toHaveLength(1);
    expect(seen[0].available).toBe(true);
  });

  it('does not report the very first install (no controller yet)', async () => {
    const { manager, registration } = await setup(container => (container.controller = null));
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);

    registration.foundUpdate().setState('installed');

    expect(callback).not.toHaveBeenCalled();
  });

  it('reports a worker that is already waiting when the page starts', async () => {
    const { manager } = await setup(container => {
      container.registration.waiting = new FakeWorker();
    });
    const callback = jest.fn();
    manager.onUpdateAvailable(callback); // subscribes after the fact: must still be told
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not report a waiting worker when nothing is controlled yet', async () => {
    const { manager } = await setup(container => {
      container.controller = null;
      container.registration.waiting = new FakeWorker();
    });
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('replays an update found before anyone subscribed (the banner mounts late)', async () => {
    const { manager, registration } = await setup();
    registration.foundUpdate().setState('installed');

    const late = jest.fn();
    manager.onUpdateAvailable(late);

    expect(late).toHaveBeenCalledTimes(1);
  });

  it('ignores the old worker broadcast "SW_UPDATE_AVAILABLE": it arrives after the update was applied', async () => {
    const { manager, container } = await setup();
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);

    container.dispatchEvent(
      Object.assign(new Event('message'), { data: { type: 'SW_UPDATE_AVAILABLE', version: '9' } })
    );

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('subscribing', () => {
  it('stops calling a subscriber after it unsubscribes, and subscribers do not pile up', async () => {
    const { manager, registration } = await setup();
    const callback = jest.fn();
    for (let i = 0; i < 5; i++) {
      // what a component that re-subscribes on every route change would do, with cleanup
      manager.onUpdateAvailable(callback)();
    }
    const kept = jest.fn();
    manager.onUpdateAvailable(kept);
    const dropped = jest.fn();
    manager.onUpdateAvailable(dropped)();

    registration.foundUpdate().setState('installed');

    expect(callback).not.toHaveBeenCalled();
    expect(dropped).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('a throwing subscriber does not stop the others', async () => {
    const { manager, registration } = await setup();
    manager.onUpdateAvailable(() => {
      throw new Error('broken subscriber');
    });
    const healthy = jest.fn();
    manager.onUpdateAvailable(healthy);

    registration.foundUpdate().setState('installed');

    expect(healthy).toHaveBeenCalledTimes(1);
  });
});

describe('applying an update', () => {
  const withWaitingWorker = async () => {
    const waiting = new FakeWorker();
    const ctx = await setup(container => (container.registration.waiting = waiting));
    return { ...ctx, waiting };
  };

  it('never reloads by itself, not even when control changes', async () => {
    const { container } = await withWaitingWorker();
    container.dispatchEvent(new Event('controllerchange'));
    jest.advanceTimersByTime(60_000);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('asks the waiting worker to activate, then reloads once when it takes control', async () => {
    const { manager, container, waiting } = await withWaitingWorker();

    await manager.applyUpdate();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reloadPage).not.toHaveBeenCalled(); // not before the new worker is in control

    container.dispatchEvent(new Event('controllerchange'));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads only once however often it is asked or notified', async () => {
    const { manager, container, waiting } = await withWaitingWorker();

    await manager.applyUpdate();
    await manager.applyUpdate();
    await manager.applyUpdate();
    container.dispatchEvent(new Event('controllerchange'));
    container.dispatchEvent(new Event('controllerchange'));

    expect(waiting.postMessage).toHaveBeenCalledTimes(1);
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway if the new worker never takes control', async () => {
    const { manager } = await withWaitingWorker();
    await manager.applyUpdate();

    jest.advanceTimersByTime(3999);
    expect(reloadPage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('with no waiting worker, a plain reload loads the new version', async () => {
    const { manager } = await setup();
    await expect(manager.applyUpdate()).resolves.toBe(true);
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('reports failure (and can be tried again) if the worker cannot be reached', async () => {
    const { manager, container } = await setup();
    container.getRegistration.mockRejectedValueOnce(new Error('registration gone'));

    await expect(manager.applyUpdate()).resolves.toBe(false);
    expect(reloadPage).not.toHaveBeenCalled();

    await expect(manager.applyUpdate()).resolves.toBe(true); // the guard was released
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

describe('overlapping and early cases', () => {
  it('concurrent applyUpdate calls post SKIP_WAITING once and reload once', async () => {
    const waiting = new FakeWorker();
    const { manager, container } = await setup(c => (c.registration.waiting = waiting));

    await Promise.all([manager.applyUpdate(), manager.applyUpdate(), manager.applyUpdate()]);
    container.dispatchEvent(new Event('controllerchange'));

    expect(waiting.postMessage).toHaveBeenCalledTimes(1);
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('announces a worker that was already installing when the page registered', async () => {
    let installing!: FakeWorker;
    const { manager } = await setup(c => {
      installing = new FakeWorker();
      c.registration.installing = installing;
    });
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);
    expect(callback).not.toHaveBeenCalled();

    installing.setState('installed');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('announces a worker that finished installing just before we attached', async () => {
    const { manager } = await setup(c => {
      const done = new FakeWorker();
      done.state = 'installed';
      c.registration.installing = done;
    });
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('exactly one reload', () => {
  const withWaitingWorker = async () => {
    const waiting = new FakeWorker();
    const ctx = await setup(container => (container.registration.waiting = waiting));
    return { ...ctx, waiting };
  };

  it('the fallback timer is cancelled once control changed: no second reload', async () => {
    const { manager, container } = await withWaitingWorker();
    const baseline = jest.getTimerCount(); // the manager's own periodic update check
    await manager.applyUpdate();
    expect(jest.getTimerCount()).toBe(baseline + 1); // the fallback is armed

    container.dispatchEvent(new Event('controllerchange'));
    expect(jest.getTimerCount()).toBe(baseline); // and disarmed: nothing left that could reload later
    jest.advanceTimersByTime(60_000);

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('after the fallback fired, a late controllerchange does not reload again', async () => {
    const { manager, container } = await withWaitingWorker();
    await manager.applyUpdate();

    jest.advanceTimersByTime(4000);
    container.dispatchEvent(new Event('controllerchange'));

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

describe('an update accepted in another tab', () => {
  it('offers a reload to this (old) tab instead of reloading it unasked', async () => {
    const { manager, container } = await setup();
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);

    container.dispatchEvent(new Event('controllerchange')); // another tab accepted the update

    expect(callback).toHaveBeenCalledTimes(1);
    expect(reloadPage).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('and accepting reloads once (there is no waiting worker any more)', async () => {
    const { manager, container } = await setup();
    container.dispatchEvent(new Event('controllerchange'));

    await manager.applyUpdate();
    await manager.applyUpdate();

    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('a page that started uncontrolled (a first install) is not told there is an update', async () => {
    const { manager, container } = await setup(c => (c.controller = null));
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);

    container.controller = {};
    container.dispatchEvent(new Event('controllerchange'));

    expect(callback).not.toHaveBeenCalled();
  });

  it('the tab that asked for the update is not also told about it', async () => {
    const waiting = new FakeWorker();
    const { manager, container } = await setup(c => (c.registration.waiting = waiting));
    const callback = jest.fn();
    manager.onUpdateAvailable(callback);
    callback.mockClear(); // the initial replay is expected
    await manager.applyUpdate();

    container.dispatchEvent(new Event('controllerchange'));

    expect(callback).not.toHaveBeenCalled();
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

describe('without service worker support', () => {
  it('does nothing and applyUpdate reports it', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    let manager!: typeof import('../pwaUpdateManager').pwaUpdateManager;
    await jest.isolateModulesAsync(async () => {
      manager = (await import('../pwaUpdateManager')).pwaUpdateManager;
    });
    window.dispatchEvent(new Event('load'));
    await expect(manager.applyUpdate()).resolves.toBe(false);
    expect(reloadPage).not.toHaveBeenCalled();
  });
});
