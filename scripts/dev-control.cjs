#!/usr/bin/env node
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'dev-control.cjs');
const stateDir = path.join(root, '.levelup-dev');
const stateFile = path.join(stateDir, 'supervisor.json');
const lockDir = path.join(stateDir, 'lock');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function port(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

function ports() {
  const storage = port('LEVELUP_STORAGE_PORT', 3001);
  const vite = port('LEVELUP_VITE_PORT', 5173);
  if (storage === vite) throw new Error('Storage and Vite ports must differ');
  return { storage, vite };
}

function health(portNumber, pathname, requireHealthy = false, timeout = 1000) {
  return new Promise((resolve, reject) => {
    let timer;
    const finish = error => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const request = http.get({ hostname: 'localhost', port: portNumber, path: pathname }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 65536) request.destroy(new Error('Health response too large'));
      });
      response.on('error', finish);
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return finish(new Error(`HTTP ${response.statusCode} from port ${portNumber}${pathname}`));
        }
        if (requireHealthy) {
          try {
            if (JSON.parse(body).status !== 'healthy') throw new Error('status is not healthy');
          } catch (error) {
            return finish(new Error(`Unhealthy response from port ${portNumber}: ${error.message}`));
          }
        }
        finish();
      });
    });
    timer = setTimeout(() => request.destroy(new Error(`Health request timed out on port ${portNumber}`)), timeout);
    request.on('error', finish);
  });
}

function readState() {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (!Number.isSafeInteger(data.pid) || data.pid <= 1 || !/^[a-f0-9]{32}$/.test(data.token)) {
      throw new Error('invalid supervisor state');
    }
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Cannot read ${stateFile}: ${error.message}. Inspect and remove it if stale.`);
  }
}

function owned(state) {
  const result = spawnSync('ps', ['-p', String(state.pid), '-o', 'args='], { encoding: 'utf8' });
  if (result.error) throw new Error(`Cannot inspect PID ${state.pid}: ${result.error.message}`);
  if (result.status !== 0 && result.status !== 1) throw new Error(`Cannot inspect PID ${state.pid}: ${result.stderr}`);
  return result.status === 0 && result.stdout.includes(`${script} --supervise ${state.token}`);
}

function removeState(token) {
  const state = readState();
  if (state && state.token === token) fs.unlinkSync(stateFile);
}

async function waitForExit(state, timeout = 7000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!owned(state)) return;
    await delay(100);
  }
  throw new Error(`Supervisor PID ${state.pid} did not stop; inspect it before retrying`);
}

async function stop() {
  const state = readState();
  if (!state) {
    console.log('No managed development servers for this workspace.');
    return;
  }
  if (!owned(state)) {
    console.warn(`Removing stale supervisor record for PID ${state.pid}; no process was signalled.`);
    removeState(state.token);
    return;
  }
  try {
    process.kill(state.pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  await waitForExit(state);
  removeState(state.token);
  console.log('Development servers stopped.');
}

async function start(args) {
  if (args.some(arg => arg !== '--log-files') || args.length > 1) {
    throw new Error('Usage: dev-start.sh [--log-files]');
  }
  const selectedPorts = ports();
  const existing = readState();
  if (existing && owned(existing)) {
    throw new Error('Development servers are already managed by this workspace. Stop them first.');
  }
  if (existing) {
    console.warn(`Removing stale supervisor record for PID ${existing.pid}; no process was signalled.`);
    removeState(existing.token);
  }
  const token = crypto.randomBytes(16).toString('hex');
  const child = spawn(process.execPath, [script, '--supervise', token], {
    cwd: root, detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  const state = { pid: child.pid, token };
  if (!state.pid) throw new Error('Could not start development supervisor');
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  const outcome = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => reject(new Error(`Supervisor exited before readiness (${signal || code})`)));
    child.on('message', message => {
      if (message.type === 'ready') resolve();
      if (message.type === 'error') reject(new Error(message.message));
    });
  });
  child.send({ ports: selectedPorts, logFiles: args.includes('--log-files') });
  try {
    await outcome;
    child.disconnect();
    child.unref();
    console.log(`Development environment ready: http://localhost:${selectedPorts.vite}`);
    console.log(`API health: http://localhost:${selectedPorts.vite}/api/health`);
  } catch (error) {
    if (owned(state)) {
      process.kill(state.pid, 'SIGTERM');
      await waitForExit(state);
    }
    removeState(token);
    throw error;
  }
}

async function supervise(token) {
  let ready = false;
  let stopping = false;
  const children = [];
  let failure;
  const report = message => {
    try { fs.writeSync(2, `${message}\n`); } catch (error) {
      if (error.code !== 'EPIPE' && error.code !== 'EBADF') throw error;
    }
  };
  const fail = error => {
    if (failure) return;
    failure = error;
    if (ready && !stopping) {
      report(failure.message);
      void cleanup();
    }
  };

  function groupMembers(child) {
    if (!child.pid) return [];
    const result = spawnSync('ps', ['-eo', 'pid=,pgid=,stat='], { encoding: 'utf8' });
    if (result.error || result.status !== 0) {
      throw new Error(`Cannot inspect development process group ${child.pid}: ${result.error?.message || result.stderr}`);
    }
    return result.stdout.split('\n').map(line => line.trim().split(/\s+/))
      .filter(([pid, pgid, stat]) => Number(pgid) === child.pid && Number(pid) !== child.pid && stat && !stat.startsWith('Z'));
  }

  function signalChild(child, signal) {
    if (!child.pid) return false;
    const result = spawnSync('ps', ['-p', String(child.pid), '-o', 'args='], { encoding: 'utf8' });
    if (result.error || (result.status !== 0 && result.status !== 1)) {
      throw new Error(`Cannot verify development process PID ${child.pid}; it was not signalled.`);
    }
    if (result.status !== 0 || !result.stdout.includes(child.ownerMarker)) return false;
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    return true;
  }

  async function cleanup() {
    if (stopping) return;
    stopping = true;
    try {
      for (const child of children) {
        if (!signalChild(child, 'SIGTERM') && groupMembers(child).length) {
          throw new Error(`Cannot verify process group ${child.pid}; its remaining processes were not signalled.`);
        }
      }
      const deadline = Date.now() + 3000;
      while (children.some(child => groupMembers(child).length) && Date.now() < deadline) {
        await delay(50);
      }
      for (const child of children) {
        if (groupMembers(child).length && !signalChild(child, 'SIGKILL')) {
          throw new Error(`Cannot verify process group ${child.pid}; its remaining processes were not signalled.`);
        }
      }
      const killDeadline = Date.now() + 2000;
      while (children.some(child => groupMembers(child).length) && Date.now() < killDeadline) {
        await delay(50);
      }
      if (children.some(child => groupMembers(child).length)) throw new Error('Some development processes did not stop.');
      for (const child of children) signalChild(child, 'SIGKILL');
      try { removeState(token); } catch (error) { report(error.message); }
      process.exit(failure ? 1 : 0);
    } catch (error) {
      report(`${error.message} The supervisor remains available for another stop attempt.`);
      stopping = false;
    }
  }

  process.on('SIGTERM', () => { void cleanup(); });
  process.on('SIGINT', () => { void cleanup(); });
  process.on('disconnect', () => { if (!ready) void cleanup(); });
  const config = await new Promise(resolve => process.once('message', resolve));
  const { storage, vite } = config.ports;
  const logs = config.logFiles ? path.join(root, 'logs') : null;
  try {
    if (logs) fs.mkdirSync(logs, { recursive: true });
  } catch (error) {
    fail(new Error(`Cannot create log directory ${logs}: ${error.message}`));
    if (process.connected) process.send({ type: 'error', message: failure.message });
    await cleanup();
    return;
  }
  if (!logs) process.stdout.on('error', error => fail(new Error(`Cannot write development output: ${error.message}`)));

  function launch(name, args, marker) {
    const ownerMarker = `levelup-${token}-${name}`;
    const child = spawn(process.execPath, [`--title=${ownerMarker}`, path.join(root, 'scripts', 'dev-service.cjs'), ...args], {
      cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    child.ownerMarker = ownerMarker;
    children.push(child);
    let output = '';
    let listening = false;
    const target = logs ? fs.createWriteStream(path.join(logs, `${name}.log`), { flags: 'a' }) : process.stdout;
    if (logs) target.on('error', error => fail(new Error(`Cannot write ${name} log: ${error.message}`)));
    const forward = chunk => {
      target.write(chunk);
      output = (output + chunk.toString()).slice(-8192);
      if (marker.test(output)) listening = true;
    };
    child.stdout.on('data', forward);
    child.stderr.on('data', forward);
    child.on('error', error => fail(new Error(`${name} failed to start: ${error.message}`)));
    child.on('message', message => {
      if (message.type === 'error') fail(new Error(`${name} failed to start: ${message.message}`));
      if (message.type === 'exit' && !stopping) {
        fail(new Error(`${name} exited (${message.signal || message.code}); check logs and port availability`));
      }
    });
    child.on('exit', (code, signal) => {
      if (!stopping) {
        fail(new Error(`${name} process-group anchor exited (${signal || code})`));
      }
    });
    return () => listening;
  }

  const storageListening = launch('storage', [path.join(root, 'scripts', 'dev-storage-server.cjs')], /Local development storage server running/);
  const viteListening = launch('vite', [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(vite), '--strictPort'], /ready in/i);
  const timeout = Number(process.env.LEVELUP_DEV_TIMEOUT_MS || 15000);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120000) {
    fail(new Error('LEVELUP_DEV_TIMEOUT_MS must be an integer between 1 and 120000'));
  }
  const deadline = Date.now() + timeout;
  let lastError = 'waiting for servers to listen';
  while (Date.now() < deadline && !stopping) {
    if (failure) break;
    if (storageListening() && viteListening()) {
      try {
        const remaining = () => Math.max(1, Math.min(1000, deadline - Date.now()));
        await health(storage, '/api/health', true, remaining());
        await health(vite, '/', false, remaining());
        await health(vite, '/api/health', true, remaining());
        if (failure) break;
        if (Date.now() >= deadline) break;
        ready = true;
        process.send({ type: 'ready' });
        return;
      } catch (error) {
        lastError = error.message;
      }
    }
    await delay(200);
  }
  if (stopping) return;
  fail(new Error(`Development startup failed: ${failure ? failure.message : `timed out: ${lastError}`}`));
  if (process.connected) process.send({ type: 'error', message: failure.message });
  await cleanup();
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === '--supervise') return supervise(args[0]);
  if (command === 'health') {
    const { vite } = ports();
    try {
      await health(vite, '/api/health', true);
      console.log('Storage API is healthy through the Vite proxy.');
    } catch (error) {
      throw new Error(`Storage API health check failed: ${error.message}. Start with npm run dev:start.`);
    }
    return;
  }
  if (command !== 'start' && command !== 'stop') throw new Error('Usage: dev-control.cjs start|stop|health');
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  try {
    fs.mkdirSync(lockDir);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another control command is running, or ${lockDir} is stale. Inspect it before removing it.`);
    throw error;
  }
  try {
    if (command === 'start') await start(args);
    else {
      if (args.length) throw new Error('Usage: dev-stop.sh');
      await stop();
    }
  } finally {
    fs.rmdirSync(lockDir);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
