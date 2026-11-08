'use strict';

const { spawn } = require('node:child_process');

// Keep the group leader alive until the supervisor has reaped the group.
process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
process.on('message', () => {});

const child = spawn(process.execPath, process.argv.slice(2), {
  stdio: ['ignore', 'inherit', 'inherit'],
});

child.on('error', error => {
  if (process.connected) process.send({ type: 'error', message: error.message });
});
child.on('exit', (code, signal) => {
  if (process.connected) process.send({ type: 'exit', code, signal });
});
