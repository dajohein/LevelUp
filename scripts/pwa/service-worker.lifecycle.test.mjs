import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const sourcePath = process.env.SW_SOURCE ?? path.join(repository, 'public/sw.js');
const source = readFileSync(sourcePath, 'utf8');

// Development defaults derive cache names from Date.now(), so pin it.
const CURRENT = ['levelup-v1', 'levelup-offline-v1', 'levelup-data-v1'];

// Runs the real worker source in a vm context with a hand-made worker global scope.
function createWorker({ caches: initial = [], addAll } = {}) {
  const handlers = new Map();
  const calls = [];
  const stores = new Map(initial.map(name => [name, new Map()]));
  const clientMessages = [new Set(), new Set()].map(() => []);
  const clients = clientMessages.map(messages => ({
    postMessage: message => messages.push(message),
  }));
  const fakeCaches = {
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        addAll: addAll ?? (async () => {}),
        match: async key => store.get(key),
        put: async (key, value) => store.set(key, value),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    match: async () => undefined,
  };
  const self = {
    addEventListener: (type, handler) => handlers.set(type, handler),
    skipWaiting: () => {
      calls.push('skipWaiting');
      return Promise.resolve();
    },
    clients: {
      claim: () => {
        calls.push('claim');
        return Promise.resolve();
      },
      matchAll: async () => clients,
      openWindow: async () => {},
    },
    registration: { showNotification: async () => {} },
  };
  const sandbox = {
    self,
    caches: fakeCaches,
    clients: self.clients,
    location: { origin: 'https://levelup.test' },
    fetch: async () => ({ ok: true, clone() {} }),
    Request: class {
      constructor(url, init) {
        Object.assign(this, { url, ...init });
      }
    },
    Response: class {},
    URL,
    Date: { now: () => 1 },
    setTimeout,
    console: { log() {}, warn() {}, error() {} },
  };
  vm.runInNewContext(source, sandbox, { filename: sourcePath });

  async function dispatch(type, data) {
    const event = {
      data,
      promises: [],
      waitUntil(promise) {
        this.promises.push(promise);
      },
    };
    handlers.get(type)(event);
    await Promise.all(event.promises);
    // The message handler runs its promise chain without waitUntil; let it drain.
    for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
  }
  return { dispatch, calls, stores, clientMessages };
}

test('install precaches into the current cache and must not skipWaiting', async () => {
  const added = [];
  const worker = createWorker({ addAll: async requests => added.push(...requests) });
  await worker.dispatch('install');
  assert.ok(added.length > 0, 'static resources are precached');
  assert.ok(worker.stores.has(CURRENT[0]), 'the current shell cache was opened');
  assert.deepEqual(worker.calls, [], 'a new worker waits instead of skipping waiting');
});

test('install fails when precaching fails and still never skipWaiting', async () => {
  const worker = createWorker({
    addAll: async () => {
      throw new Error('precache failed');
    },
  });
  await assert.rejects(worker.dispatch('install'), /precache failed/);
  assert.deepEqual(worker.calls, []);
});

test('SKIP_WAITING calls skipWaiting then claim, then notifies every client', async () => {
  const worker = createWorker();
  await worker.dispatch('message', { type: 'SKIP_WAITING' });
  assert.deepEqual(worker.calls, ['skipWaiting', 'claim']);
  assert.equal(worker.clientMessages.length, 2);
  for (const messages of worker.clientMessages) {
    assert.equal(messages.length, 1);
    assert.equal(messages[0].type, 'SW_UPDATED_APPLIED');
  }
});

test('other messages do nothing', async () => {
  const worker = createWorker();
  for (const data of [{ type: 'SOMETHING_ELSE' }, { type: 'skip_waiting' }, {}, null, undefined]) {
    await worker.dispatch('message', data);
  }
  assert.deepEqual(worker.calls, []);
  assert.deepEqual(worker.clientMessages, [[], []]);
});

test('activate removes outdated LevelUp caches, keeps current and non-LevelUp ones', async () => {
  const worker = createWorker({
    caches: [...CURRENT, 'levelup-v0', 'levelup-offline-v0', 'levelup-data-old', 'other-app'],
  });
  await worker.dispatch('activate');
  assert.deepEqual([...worker.stores.keys()].sort(), [...CURRENT, 'other-app'].sort());
});

test('activate must not broadcast SW_UPDATE_AVAILABLE or claim clients itself', async () => {
  const worker = createWorker({ caches: [...CURRENT, 'levelup-v0'] });
  await worker.dispatch('activate');
  assert.deepEqual(worker.calls, [], 'activate neither skips waiting nor claims');
  assert.deepEqual(worker.clientMessages, [[], []], 'activate posts nothing to clients');
});
