const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ESLint } = require('eslint');
const { compareWarnings, warningKey, baselineFromCommit } = require('./check-lint-baseline.cjs');

const cwd = '/repo';
const message = {
  severity: 1,
  ruleId: 'no-console',
  message: 'Unexpected console statement.',
  line: 1,
  column: 1,
};
const source = 'console.log("existing");';
const filePath = '/repo/src/example.ts';
const baseline = {
  version: 1,
  warnings: { [warningKey(filePath, message, source, cwd)]: 1 },
};
const result = { filePath, messages: [message], source };

test('existing debt passes and survives line shifts and indentation', () => {
  const shifted = {
    ...result,
    source: `\n  ${source}\r\n`,
    messages: [{ ...message, line: 2 }],
  };
  assert.equal(compareWarnings([shifted], baseline, cwd).regressions.length, 0);
});

test('new warnings and duplicates fail', () => {
  const added = {
    ...result,
    source: `${source}\n${source}`,
    messages: [message, { ...message, line: 2 }],
  };
  assert.equal(compareWarnings([added], baseline, cwd).regressions.length, 1);
  assert.equal(compareWarnings([result], { version: 1, warnings: {} }, cwd).regressions.length, 1);
});

test('fixing old debt cannot offset new warnings, even in the same file', () => {
  const changed = { ...result, source: 'console.log("new");' };
  const report = compareWarnings([changed], baseline, cwd);
  assert.equal(report.regressions.length, 1);
  assert.equal(report.resolved, 1);
});

test('allowances cannot transfer to another file or rule', () => {
  assert.equal(
    compareWarnings([{ ...result, filePath: '/repo/src/other.ts' }], baseline, cwd).regressions
      .length,
    1
  );
  assert.equal(
    compareWarnings(
      [{ ...result, messages: [{ ...message, ruleId: 'other-rule' }] }],
      baseline,
      cwd
    ).regressions.length,
    1
  );
});

test('errors and parser failures always fail, even with a matching allowance', () => {
  for (const change of [{ severity: 2 }, { fatal: true }]) {
    const report = compareWarnings(
      [{ ...result, messages: [{ ...message, ...change }] }],
      baseline,
      cwd
    );
    assert.equal(report.regressions.length, 1);
    assert.equal(report.errors, 1);
  }
});

test('resolved debt is reported and pruning keeps only current warnings', () => {
  const report = compareWarnings([], baseline, cwd);
  assert.equal(report.resolved, 1);
  assert.deepEqual(report.current, {});
  assert.equal(report.regressions.length, 0);
});

test('missing sources do not match recorded source text', () => {
  assert.equal(
    compareWarnings([{ ...result, source: undefined }], baseline, cwd).regressions.length,
    1
  );
});

test('malformed baselines fail closed', () => {
  for (const invalid of [
    null,
    {},
    { version: 2, warnings: {} },
    { version: 1, warnings: [] },
    { version: 1, warnings: { x: -1 } },
    { version: 1, warnings: { x: '1' } },
  ]) {
    assert.throws(() => compareWarnings([], invalid, cwd), /Invalid lint baseline/);
  }
});

test('base comparison uses immutable Git sources, not the candidate or stale snapshot', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'levelup-lint-base-'));
  try {
    const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
    git(['init', '--quiet']);
    await fs.mkdir(path.join(directory, 'src'));
    const file = 'src/existing warning.ts';
    const absoluteFile = path.join(directory, file);
    await fs.writeFile(absoluteFile, source);
    git(['add', '--', file]);
    git([
      '-c',
      'user.name=Lint policy test',
      '-c',
      'user.email=lint-policy@example.test',
      'commit',
      '--quiet',
      '-m',
      'Base warning',
    ]);
    const commit = git(['rev-parse', 'HEAD']);
    await fs.writeFile(absoluteFile, 'console.log("new");');
    const eslint = new ESLint({
      cwd: directory,
      useEslintrc: false,
      overrideConfig: { rules: { 'no-console': 'warn' } },
    });
    const base = await baselineFromCommit(eslint, commit, directory);
    const [existing] = await eslint.lintText(source, { filePath: absoluteFile });
    const candidate = await eslint.lintText(await fs.readFile(absoluteFile, 'utf8'), {
      filePath: absoluteFile,
    });

    assert.equal(
      compareWarnings([existing], { version: 1, warnings: {} }, directory).regressions.length,
      1
    );
    assert.equal(compareWarnings([existing], base, directory).regressions.length, 0);
    assert.equal(compareWarnings(candidate, base, directory).regressions.length, 1);
    assert.equal(
      compareWarnings([{ ...existing, messages: [{ ...message, severity: 2 }] }], base, directory)
        .errors,
      1
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('invalid and unavailable base commits fail closed', async () => {
  for (const commit of ['main', '', 'HEAD', '--prune', '0'.repeat(40)]) {
    await assert.rejects(baselineFromCommit({}, commit, process.cwd()));
  }
});
