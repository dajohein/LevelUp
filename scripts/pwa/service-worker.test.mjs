import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'vite';
import { serviceWorkerVersioning } from '../service-worker-versioning.mjs';
import { chromeBinary, openBrowser, waitFor } from './browser-test-helper.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const sourcePath = path.join(repository, 'public/sw.js');
const template = await readFile(sourcePath, 'utf8');

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'levelup-sw-build-'));
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'public/sw.js'), template);
  await writeFile(path.join(root, 'public/manifest.json'), '{}');
  await writeFile(path.join(root, 'public/icon.svg'), '<svg></svg>');
  await writeFile(path.join(root, 'style.css'), 'body { color: green; }');
  await release(root, 'first');
  return root;
}

async function release(root, name) {
  await writeFile(
    path.join(root, 'index.html'),
    '<!doctype html><title>Offline fixture</title><script type="module" src="/main.js"></script>'
  );
  await writeFile(
    path.join(root, 'main.js'),
    `import './style.css'; window.release = ${JSON.stringify(name)};
     window.loadLazy = () => import('./lazy.js').then(module => module.value);`
  );
  await writeFile(path.join(root, 'lazy.js'), `export const value = '${name}-lazy';`);
}

async function emit(root, outDir = 'dist', plugins = [serviceWorkerVersioning()]) {
  await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins,
    build: { outDir, minify: false },
  });
  const worker = await readFile(path.join(root, outDir, 'sw.js'), 'utf8');
  return { worker, id: worker.match(/const RELEASE_ID = '([a-f0-9]{64})';/)?.[1] };
}

test('deployment output versions content deterministically without git or source writes', async t => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  // Reproduce Vite's old behavior: public workers are copied verbatim.
  const unversioned = await emit(root, 'unversioned', []);
  assert.equal(unversioned.worker, template);
  assert.equal(unversioned.id, undefined);

  const first = await emit(root);
  assert.match(first.id, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(first.worker, /__[A-Z_]+__/);
  assert.equal((await emit(root)).worker, first.worker, 'identical output is deterministic');
  assert.equal(
    (await emit(root, 'other-output')).worker,
    first.worker,
    'absolute build path does not enter the hash'
  );

  await release(root, 'second');
  const second = await emit(root);
  assert.notEqual(second.id, first.id, 'application changes invalidate the worker');
  await writeFile(path.join(root, 'public/icon.svg'), '<svg>changed</svg>');
  const publicChange = await emit(root);
  assert.notEqual(publicChange.id, second.id, 'public asset changes invalidate the worker');
  await writeFile(path.join(root, 'public/sw.js'), `${template}\n// Worker behavior changed\n`);
  assert.notEqual((await emit(root)).id, publicChange.id, 'worker changes invalidate the cache');

  assert.equal(await readFile(sourcePath, 'utf8'), template);
  assert.equal(
    await readFile(path.join(root, 'public/sw.js'), 'utf8'),
    `${template}\n// Worker behavior changed\n`
  );
});

test('failed builds never modify the worker source and invalid templates fail explicitly', async t => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'main.js'), "import './does-not-exist.js';");
  await assert.rejects(emit(root), /Could not resolve/);
  assert.equal(await readFile(path.join(root, 'public/sw.js'), 'utf8'), template);
  assert.equal(await readFile(sourcePath, 'utf8'), template);

  await release(root, 'first');
  await writeFile(path.join(root, 'public/sw.js'), '// Invalid template');
  await assert.rejects(emit(root), /template markers are missing/);
  assert.equal(await readFile(path.join(root, 'public/sw.js'), 'utf8'), '// Invalid template');
});

test(
  'real browser updates releases, removes old caches, and navigates offline with lazy assets',
  {
    skip:
      !chromeBinary && 'Chrome/Chromium not installed; set CHROME_BIN to run this integration test',
    timeout: 90000,
  },
  async t => {
    const root = await fixture();
    t.after(() => rm(root, { recursive: true, force: true }));
    const first = await emit(root, 'first');
    await release(root, 'second');
    const second = await emit(root, 'second');
    let deployment = 'first';
    let networkUnavailable = false;
    const server = createServer(async (request, response) => {
      // Worker targets can bypass page-level CDP offline emulation.
      if (networkUnavailable) {
        request.socket.destroy();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = pathname === '/' || !path.extname(pathname) ? 'index.html' : pathname.slice(1);
      try {
        const content = await readFile(path.join(root, deployment, file));
        if (networkUnavailable) {
          request.socket.destroy();
          return;
        }
        const type = file.endsWith('.js')
          ? 'text/javascript'
          : file.endsWith('.css')
            ? 'text/css'
            : file.endsWith('.json')
              ? 'application/json'
              : 'text/html';
        response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        response.end(content);
      } catch (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500);
        response.end(String(error));
      }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(
      () =>
        new Promise(resolve => {
          server.close(resolve);
          server.closeAllConnections();
        })
    );
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await openBrowser();
    t.after(() => browser.close());
    async function offline(enabled) {
      networkUnavailable = enabled;
      if (enabled) server.closeAllConnections();
      await browser.offline(enabled);
    }
    await browser.navigate(origin);
    await waitFor(() => browser.evaluate("window.release === 'first'"), 'initial application');
    await browser.evaluate(`(async () => {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
  })()`);
    await browser.navigate(`${origin}/controlled`);
    await waitFor(
      () =>
        browser.evaluate(
          "Boolean(navigator.serviceWorker.controller) && window.release === 'first'"
        ),
      'controlled page'
    );
    const firstCache = `levelup-v2.0.0-${first.id}`;
    const secondCache = `levelup-v2.0.0-${second.id}`;
    assert.ok((await browser.evaluate('caches.keys()')).includes(firstCache));
    // Seed all prior cache tiers and an unrelated application's cache.
    await browser.evaluate(`Promise.all([
    caches.open('levelup-offline-v2.0.0-${first.id}'),
    caches.open('levelup-data-v2.0.0-${first.id}'),
    caches.open('unrelated-app-cache')
  ])`);
    await offline(true);
    await browser.navigate(`${origin}/offline/first`);
    await waitFor(() => browser.evaluate("window.release === 'first'"), 'first offline shell');
    assert.equal(await browser.evaluate('window.loadLazy()'), 'first-lazy');

    await offline(false);
    deployment = 'second';
    await browser.evaluate(
      '(async () => (await navigator.serviceWorker.getRegistration()).update())()'
    );
    await waitFor(async () => {
      const names = await browser.evaluate('caches.keys()');
      return names.includes(secondCache) && !names.some(name => name.includes(first.id));
    }, 'new worker activation and cleanup');
    assert.deepEqual(
      (await browser.evaluate('caches.keys()')).sort(),
      [secondCache, 'unrelated-app-cache'].sort()
    );

    await browser.navigate(`${origin}/second-controlled`);
    await waitFor(
      () =>
        browser.evaluate(
          "Boolean(navigator.serviceWorker.controller) && window.release === 'second'"
        ),
      'updated app'
    );
    await offline(true);
    await browser.navigate(`${origin}/offline/second`);
    await waitFor(() => browser.evaluate("window.release === 'second'"), 'second offline shell');
    assert.equal(await browser.evaluate('window.loadLazy()'), 'second-lazy');

    // Negative controls must fail despite the fixture server still running.
    assert.equal(
      await browser.evaluate(`(async () => {
        const cache = await caches.open('${secondCache}');
        const requests = await cache.keys();
        const lazy = requests.find(request => /\\/lazy-[^/]+\\.js$/.test(new URL(request.url).pathname));
        return lazy ? cache.delete(lazy) : false;
      })()`),
      true,
      'remove the precached lazy chunk'
    );
    await browser.navigate(`${origin}/offline/missing-lazy`);
    await waitFor(
      () => browser.evaluate("window.release === 'second'"),
      'shell without lazy chunk'
    );
    assert.equal(
      await browser.evaluate('window.loadLazy().then(() => false, () => true)'),
      true,
      'a missing lazy chunk cannot fall back to the network'
    );
    assert.equal(
      await browser.evaluate(`(async () => {
        const cache = await caches.open('${secondCache}');
        return cache.delete('/index.html');
      })()`),
      true,
      'remove the precached shell'
    );
    await browser.navigate(`${origin}/offline/missing-shell`);
    await waitFor(
      () => browser.evaluate("document.body?.textContent === 'Offline' && !window.release"),
      'missing shell offline error'
    );
    assert.equal(await readFile(sourcePath, 'utf8'), template);
  }
);
