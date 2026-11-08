const assert = require('node:assert/strict');
const test = require('node:test');
const { compareWarnings, warningKey } = require('./check-lint-baseline.cjs');

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
