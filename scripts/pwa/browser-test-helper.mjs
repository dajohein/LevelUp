import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export const chromeBinary = [
  process.env.CHROME_BIN,
  'google-chrome',
  'chromium',
  'chromium-browser',
]
  .filter(Boolean)
  .find(binary => spawnSync(binary, ['--version']).status === 0);

/** Start an isolated real browser and communicate through its local CDP socket. */
export async function openBrowser() {
  const profile = await mkdtemp(path.join(tmpdir(), 'levelup-sw-chrome-'));
  const processHandle = spawn(
    chromeBinary,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(
        () => reject(new Error(`Chrome startup timed out: ${output}`)),
        15000
      );
      processHandle.once('error', error => {
        clearTimeout(timer);
        reject(error);
      });
      processHandle.once('exit', code => {
        clearTimeout(timer);
        reject(new Error(`Chrome exited (${code}): ${output}`));
      });
      processHandle.stderr.on('data', chunk => {
        output += chunk;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
    });
    socket = new WebSocket(endpoint);
    await once(socket, 'open');
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      clearTimeout(callback.timer);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    });
    function send(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`CDP timed out: ${method}`));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      });
    }
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    await page('Page.enable');
    await page('Network.enable');
    return {
      async evaluate(expression) {
        const result = await page('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (result.exceptionDetails) {
          throw new Error(JSON.stringify(result.exceptionDetails));
        }
        return result.result.value;
      },
      async navigate(url) {
        const result = await page('Page.navigate', { url });
        if (result.errorText) throw new Error(result.errorText);
      },
      offline(enabled) {
        return page('Network.emulateNetworkConditions', {
          offline: enabled,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1,
        });
      },
      async close() {
        const exited = once(processHandle, 'exit');
        try {
          await send('Browser.close');
        } finally {
          socket.close();
          processHandle.kill();
          await exited;
          await rm(profile, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    socket?.close();
    const exited = processHandle.exitCode === null ? once(processHandle, 'exit') : null;
    processHandle.kill();
    if (exited) await exited;
    await rm(profile, { recursive: true, force: true });
    throw error;
  }
}

export async function waitFor(check, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}
