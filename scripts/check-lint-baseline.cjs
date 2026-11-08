const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ESLint } = require('eslint');

const baselinePath = path.join(__dirname, 'lint-baseline.json');

// Ignore line-number shifts, but never exchange warnings between files or source text.
function warningKey(filePath, message, source, cwd) {
  const file = path.relative(cwd, filePath).split(path.sep).join('/');
  const line = source.split(/\r?\n/)[message.line - 1]?.trim() ?? '';
  return JSON.stringify([file, message.ruleId, message.message, line]);
}

function compareWarnings(results, baseline, cwd) {
  if (
    !baseline ||
    baseline.version !== 1 ||
    !baseline.warnings ||
    typeof baseline.warnings !== 'object' ||
    Array.isArray(baseline.warnings)
  ) {
    throw new Error('Invalid lint baseline; expected version 1 and warning counts.');
  }
  for (const count of Object.values(baseline.warnings)) {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error('Invalid lint baseline warning count.');
    }
  }

  const current = {};
  const regressions = [];
  let errors = 0;
  let warnings = 0;
  for (const result of results) {
    for (const message of result.messages) {
      if (message.severity === 2 || message.fatal) {
        errors++;
        regressions.push({ file: result.filePath, message });
      } else if (message.severity === 1) {
        warnings++;
        const key = warningKey(result.filePath, message, result.source ?? '', cwd);
        current[key] = (current[key] ?? 0) + 1;
        if (current[key] > (baseline.warnings[key] ?? 0)) {
          regressions.push({ file: result.filePath, message });
        }
      }
    }
  }
  const allowed = Object.values(baseline.warnings).reduce((sum, count) => sum + count, 0);
  const retained = Object.entries(current).reduce(
    (sum, [key, count]) => sum + Math.min(count, baseline.warnings[key] ?? 0),
    0
  );
  return { current, regressions, errors, warnings, resolved: allowed - retained };
}

async function baselineFromCommit(eslint, commit, cwd) {
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error('Lint base must be a full commit SHA.');
  }
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git(['cat-file', '-e', `${commit}^{commit}`]);
  const files = git(['ls-tree', '-rz', '--name-only', commit, '--', 'src'])
    .split('\0')
    .filter(file => /\.tsx?$/.test(file));
  const results = [];
  for (const file of files) {
    const source = git(['show', `${commit}:${file}`]);
    results.push(...(await eslint.lintText(source, { filePath: path.join(cwd, file) })));
  }
  const report = compareWarnings(results, { version: 1, warnings: {} }, cwd);
  return { version: 1, warnings: report.current };
}

async function main() {
  const args = process.argv.slice(2);
  const useBase = args.length === 2 && args[0] === '--base-ref';
  if (!useBase && !(args.length === 0 || (args.length === 1 && args[0] === '--prune'))) {
    throw new Error(
      'Usage: node scripts/check-lint-baseline.cjs [--prune | --base-ref COMMIT_SHA]'
    );
  }
  let baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  compareWarnings([], baseline, process.cwd());
  const eslint = new ESLint({ extensions: ['.ts', '.tsx'] });
  if (useBase) {
    baseline = await baselineFromCommit(eslint, args[1], process.cwd());
    console.log(`Comparing lint warnings against base commit ${args[1]}.`);
  }
  const results = await eslint.lintFiles(['src']);
  const report = compareWarnings(results, baseline, process.cwd());
  const formatter = await eslint.loadFormatter('stylish');
  // Keep all existing debt visible in the CI log, not just the regressions.
  console.log(formatter.format(results));
  console.log(
    `Lint debt: ${report.warnings} warnings, ${report.errors} errors; ` +
      `${report.resolved} baseline warnings resolved; ${report.regressions.length} regressions.`
  );
  for (const { file, message } of report.regressions) {
    console.error(
      `${path.relative(process.cwd(), file)}:${message.line}:${message.column} ` +
        `${message.ruleId ?? 'parser'}: ${message.message}`
    );
  }
  if (report.regressions.length) {
    process.exitCode = 1;
    return;
  }
  if (args[0] === '--prune') {
    const warnings = Object.fromEntries(
      Object.entries(report.current).sort(([left], [right]) => left.localeCompare(right))
    );
    await fs.writeFile(baselinePath, JSON.stringify({ version: 1, warnings }, null, 2) + '\n');
    console.log('Pruned resolved warnings; no new allowances added.');
  }
}

module.exports = { warningKey, compareWarnings, baselineFromCommit };

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
