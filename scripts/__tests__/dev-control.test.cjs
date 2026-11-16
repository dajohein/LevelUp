'use strict';

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const source = path.resolve(__dirname, '..');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'levelup-controls-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', 'vite', 'bin'), { recursive: true });
  for (const file of ['dev-control.cjs', 'dev-service.cjs', 'dev-start.sh', 'dev-stop.sh', 'dev-restart.sh']) {
    fs.copyFileSync(path.join(source, file), path.join(root, 'scripts', file));
  }
  fs.writeFileSync(path.join(root, 'scripts', 'dev-storage-server.cjs'), `
    const http = require('node:http');
    require('node:fs').writeFileSync('storage-fixture.pid', String(process.pid));
    process.on('SIGUSR1', () => console.log('fixture log after readiness'));
    http.createServer((req, res) => {
      res.writeHead(process.env.FIXTURE_UNHEALTHY === 'http' ? 503 : 200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({status: process.env.FIXTURE_UNHEALTHY ? 'unhealthy' : 'healthy'}));
    }).listen(Number(process.env.LEVELUP_STORAGE_PORT), () => console.log('Local development storage server running'));
  `);
  fs.writeFileSync(path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), `
    const http = require('node:http');
    const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
    http.createServer((req, res) => {
      if (req.url === '/') { res.end('app'); return; }
      http.get({hostname: 'localhost', port: Number(process.env.LEVELUP_STORAGE_PORT), path: req.url}, upstream => {
        res.writeHead(upstream.statusCode);
        upstream.pipe(res);
      }).on('error', () => { res.writeHead(502); res.end(); });
    }).listen(port, () => console.log('VITE ready in 1 ms'));
  `);
  return root;
}

async function run(root, command, env, args = [], timeout = 10000) {
  const output = path.join(root, `output-${Date.now()}-${Math.random()}`);
  const fd = fs.openSync(output, 'w');
  const child = spawn('bash', [path.join(root, 'scripts', `dev-${command}.sh`), ...args], {
    cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', fd, fd],
  });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  clearTimeout(timer);
  fs.closeSync(fd);
  const text = fs.readFileSync(output, 'utf8');
  fs.unlinkSync(output);
  return { code, text, timedOut };
}

async function waitForStopped(root) {
  const state = path.join(root, '.levelup-dev', 'supervisor.json');
  const deadline = Date.now() + 8000;
  while (fs.existsSync(state) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(fs.existsSync(state), false, 'supervisor did not finish cleanup');
}

async function assertPortFree(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(Number(port), resolve));
  await new Promise(resolve => probe.close(resolve));
}

async function health(root, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', 'dev-control.cjs'), 'health'], {
      env: { ...process.env, ...env }, stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('exit', resolve);
  });
}

async function config() {
  const storage = await freePort();
  let vite = await freePort();
  while (vite === storage) vite = await freePort();
  return { LEVELUP_STORAGE_PORT: String(storage), LEVELUP_VITE_PORT: String(vite), LEVELUP_DEV_TIMEOUT_MS: '1500' };
}

test('workspaces own their processes, restart works, and stale PIDs never signal unrelated processes', async t => {
  const a = workspace();
  const b = workspace();
  const envA = await config();
  let envB = await config();
  while ([envB.LEVELUP_STORAGE_PORT, envB.LEVELUP_VITE_PORT].some(value =>
    [envA.LEVELUP_STORAGE_PORT, envA.LEVELUP_VITE_PORT].includes(value))) {
    envB = await config();
  }
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', 'vite']);
  t.after(async () => {
    await run(a, 'stop', envA);
    await run(b, 'stop', envB);
    unrelated.kill();
    fs.rmSync(a, { recursive: true, force: true });
    fs.rmSync(b, { recursive: true, force: true });
  });

  assert.equal((await run(a, 'start', envA)).code, 0);
  assert.equal((await run(b, 'start', envB, ['--log-files'])).code, 0);
  assert.equal(await health(a, envA), 0);
  assert.equal((await run(a, 'start', envA)).code, 1);
  assert.equal((await run(a, 'restart', envA)).code, 0);
  assert.equal((await run(a, 'stop', envA)).code, 0);
  assert.equal(await health(a, envA), 1);
  assert.equal(await health(b, envB), 0);
  assert.equal(unrelated.exitCode, null);

  fs.writeFileSync(path.join(a, '.levelup-dev', 'supervisor.json'), JSON.stringify({ pid: unrelated.pid, token: 'a'.repeat(32) }));
  const stale = await run(a, 'stop', envA);
  assert.equal(stale.code, 0);
  assert.match(stale.text, /stale/);
  assert.equal(unrelated.exitCode, null);
  fs.writeFileSync(path.join(a, '.levelup-dev', 'supervisor.json'), JSON.stringify({ pid: unrelated.pid, token: 'b'.repeat(32) }));
  assert.equal((await run(a, 'start', envA)).code, 0);
  assert.equal(unrelated.exitCode, null);
});

test('occupied ports fail without touching the listener and clean up started services', async t => {
  const root = workspace();
  const env = await config();
  const blocker = http.createServer((req, res) => res.end('unrelated'));
  await new Promise(resolve => blocker.listen(Number(env.LEVELUP_VITE_PORT), resolve));
  t.after(async () => {
    await run(root, 'stop', env);
    await new Promise(resolve => blocker.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const result = await run(root, 'start', env);
  assert.equal(result.code, 1);
  assert.doesNotMatch(result.text, /environment ready/);
  assert.match(result.text, /exited|EADDRINUSE/);
  assert.equal(blocker.listening, true);
  const probe = net.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(Number(env.LEVELUP_STORAGE_PORT), resolve));
  await new Promise(resolve => probe.close(resolve));
});

test('unhealthy and unreachable endpoints fail, with bounded startup cleanup', async t => {
  const root = workspace();
  const env = { ...await config(), FIXTURE_UNHEALTHY: 'http' };
  t.after(async () => {
    await run(root, 'stop', env);
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(await health(root, env), 1);
  const before = Date.now();
  const result = await run(root, 'start', env);
  assert.equal(result.code, 1);
  assert.match(result.text, /timed out.*HTTP 503/);
  assert.ok(Date.now() - before < 10000);
  assert.equal(await health(root, env), 1);
  assert.equal(fs.existsSync(path.join(root, '.levelup-dev', 'supervisor.json')), false);
});

test('health command rejects HTTP errors, unhealthy bodies, and stalled responses', async t => {
  const root = workspace();
  const env = await config();
  let mode = 'error';
  const server = http.createServer((req, res) => {
    if (mode === 'stall') return;
    if (mode === 'trickle') {
      res.writeHead(200);
      const interval = setInterval(() => res.write(' '), 100);
      res.on('close', () => clearInterval(interval));
      return;
    }
    res.writeHead(mode === 'error' ? 500 : 200);
    res.end(JSON.stringify({ status: mode === 'healthy' ? 'healthy' : 'unhealthy' }));
  });
  await new Promise(resolve => server.listen(Number(env.LEVELUP_VITE_PORT), resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(await health(root, env), 1);
  mode = 'unhealthy';
  assert.equal(await health(root, env), 1);
  mode = 'healthy';
  assert.equal(await health(root, env), 0);
  mode = 'stall';
  assert.equal(await health(root, env), 1);
  mode = 'trickle';
  const before = Date.now();
  assert.equal(await health(root, env), 1);
  assert.ok(Date.now() - before < 3000);
});

test('a healthy HTTP status with an unhealthy body is rejected', async t => {
  const root = workspace();
  const env = { ...await config(), FIXTURE_UNHEALTHY: 'body' };
  t.after(async () => {
    await run(root, 'stop', env);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const result = await run(root, 'start', env);
  assert.equal(result.code, 1);
  assert.match(result.text, /status is not healthy/);
});

test('unexpected service exit stops the remaining managed service', async t => {
  const root = workspace();
  const env = await config();
  t.after(async () => {
    await run(root, 'stop', env);
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal((await run(root, 'start', env)).code, 0);
  process.kill(Number(fs.readFileSync(path.join(root, 'storage-fixture.pid'), 'utf8')), 'SIGTERM');
  const deadline = Date.now() + 5000;
  while (fs.existsSync(path.join(root, '.levelup-dev', 'supervisor.json')) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.equal(fs.existsSync(path.join(root, '.levelup-dev', 'supervisor.json')), false);
  assert.equal(await health(root, env), 1);
});

test('devcontainer post-create hook preserves installation failure', async t => {
  const root = workspace();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const configText = fs.readFileSync(path.resolve(source, '..', '.devcontainer', 'devcontainer.json'), 'utf8');
  const match = configText.match(/"postCreateCommand"\s*:\s*"([^"]+)"/);
  assert.ok(match);
  fs.writeFileSync(path.join(root, 'npm'), '#!/bin/sh\nexit 42\n', { mode: 0o755 });
  const child = spawn('sh', ['-c', match[1]], { env: { ...process.env, PATH: `${root}:${process.env.PATH}` } });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(code, 42);
});

test('stop kills a TERM-resistant descendant after its service leader exits', async t => {
  const root = workspace();
  const env = {
    ...await config(), FIXTURE_CHILD_PORT: String(await freePort()),
    FIXTURE_MARKER: `levelup-test-${crypto.randomBytes(16).toString('hex')}`,
  };
  const fixture = path.join(root, 'scripts', 'dev-storage-server.cjs');
  fs.appendFileSync(fixture, `
    const child = require('node:child_process').spawn(process.execPath, ['--title=' + process.env.FIXTURE_MARKER, '-e',
      "process.on('SIGTERM', () => {}); require('node:net').createServer().listen(Number(process.env.FIXTURE_CHILD_PORT), () => require('node:fs').writeFileSync('descendant.pid', String(process.pid)))"
    ], { stdio: 'ignore' });
  `);
  t.after(async () => {
    await run(root, 'stop', env);
    const pidFile = path.join(root, 'descendant.pid');
    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf8'));
      const info = spawnSync('ps', ['-p', String(pid), '-o', 'args='], { encoding: 'utf8' });
      if (info.status === 0 && info.stdout.trim() === env.FIXTURE_MARKER) {
        try { process.kill(pid, 'SIGKILL'); } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
    }
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal((await run(root, 'start', env)).code, 0);
  const deadline = Date.now() + 3000;
  while (!fs.existsSync(path.join(root, 'descendant.pid')) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.ok(fs.existsSync(path.join(root, 'descendant.pid')));
  const result = await run(root, 'stop', env);
  assert.equal(result.code, 0, result.text);
  try {
    await assertPortFree(env.FIXTURE_CHILD_PORT);
  } catch (error) {
    const pid = fs.readFileSync(path.join(root, 'descendant.pid'), 'utf8');
    const info = spawnSync('ps', ['-p', pid, '-o', 'pid,ppid,pgid,sid,stat,args'], { encoding: 'utf8' });
    throw new Error(`${error.message}\nstop output: ${result.text}\n${info.stdout}`);
  }
  assert.equal(fs.existsSync(path.join(root, '.levelup-dev', 'supervisor.json')), false);
});

test('closed stdout after readiness cleans up managed services', async t => {
  const root = workspace();
  const env = await config();
  t.after(async () => {
    await run(root, 'stop', env);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const child = spawn('bash', [path.join(root, 'scripts', 'dev-start.sh')], {
    cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.resume();
  child.stderr.resume();
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(code, 0);
  child.stdout.destroy();
  process.kill(Number(fs.readFileSync(path.join(root, 'storage-fixture.pid'), 'utf8')), 'SIGUSR1');
  await waitForStopped(root);
  await assertPortFree(env.LEVELUP_STORAGE_PORT);
  await assertPortFree(env.LEVELUP_VITE_PORT);
});

test('file logging failure after readiness cleans up managed services', async t => {
  const root = workspace();
  const env = await config();
  fs.mkdirSync(path.join(root, 'logs'));
  const fifo = path.join(root, 'logs', 'storage.log');
  const mkfifo = spawnSync('mkfifo', [fifo]);
  assert.equal(mkfifo.status, 0);
  const reader = spawn('cat', [fifo], { stdio: 'ignore' });
  t.after(async () => {
    reader.kill();
    await run(root, 'stop', env);
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal((await run(root, 'start', env, ['--log-files'])).code, 0);
  reader.kill('SIGTERM');
  await new Promise(resolve => reader.once('exit', resolve));
  process.kill(Number(fs.readFileSync(path.join(root, 'storage-fixture.pid'), 'utf8')), 'SIGUSR1');
  await waitForStopped(root);
  await assertPortFree(env.LEVELUP_STORAGE_PORT);
  await assertPortFree(env.LEVELUP_VITE_PORT);
});

test('invalid log directory fails promptly and releases the control lock', async t => {
  const root = workspace();
  const env = await config();
  t.after(async () => {
    await run(root, 'stop', env);
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, 'logs'), 'not a directory');
  const result = await run(root, 'start', env, ['--log-files'], 5000);
  assert.equal(result.timedOut, false);
  assert.equal(result.code, 1);
  assert.match(result.text, /Cannot create log directory/);
  assert.equal(fs.existsSync(path.join(root, '.levelup-dev', 'lock')), false);
  assert.equal(fs.existsSync(path.join(root, '.levelup-dev', 'supervisor.json')), false);
  assert.equal((await run(root, 'start', env)).code, 0);
});
