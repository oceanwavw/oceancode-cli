# sync_repo Implementation Plan

> **For agent:** Implement this plan task-by-task using TDD discipline.

**Goal:** Build a Node.js CLI (`sync_repo.js`) for bidirectional dev/prod repo sync using an allowlist model.

**Architecture:** Single-file CLI entry point (`sync_repo.js`) with helper modules for pattern matching, file walking, and plan execution. Uses `micromatch` for glob matching and `fs-extra` for file operations. Three commands: `dev2prod`, `prod2dev`, `prune`.

**Tech Stack:** Node.js, micromatch, fs-extra

---

### Task 1: Project scaffold and CLI argument parsing
**Mode:** lightweight
**Skills:** []
**Files:** Create `package.json`, Create `sync_repo.js`

**Step 1: Initialize project**
```bash
cd /mnt/h/oceanwave/scripts
npm init -y
npm install micromatch fs-extra
```

**Step 2: Create `sync_repo.js` with CLI arg parsing**
Create `sync_repo.js`:
```js
#!/usr/bin/env node
'use strict';

const path = require('path');

const COMMANDS = ['dev2prod', 'prod2dev', 'prune'];

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0];
  if (!command || !COMMANDS.includes(command)) {
    console.error(`Usage: sync_repo.js <${COMMANDS.join('|')}> [options]`);
    console.error('');
    console.error('Commands:');
    console.error('  dev2prod  --dev <path> --prod <path> [--mirror] [--force] [--dry-run] [--verbose]');
    console.error('  prod2dev  --dev <path> --prod <path> [--force] [--dry-run] [--verbose]');
    console.error('  prune     --dev <path> --deletelist <file> [--dry-run]');
    process.exit(1);
  }

  const flags = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mirror') { flags.mirror = true; continue; }
    if (arg === '--force') { flags.force = true; continue; }
    if (arg === '--dry-run') { flags.dryRun = true; continue; }
    if (arg === '--verbose') { flags.verbose = true; continue; }
    if (arg === '--dev' && args[i + 1]) { flags.dev = path.resolve(args[++i]); continue; }
    if (arg === '--prod' && args[i + 1]) { flags.prod = path.resolve(args[++i]); continue; }
    if (arg === '--deletelist' && args[i + 1]) { flags.deletelist = path.resolve(args[++i]); continue; }
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }

  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs(process.argv);

  if (command === 'dev2prod') {
    if (!flags.dev || !flags.prod) {
      console.error('dev2prod requires --dev <path> and --prod <path>');
      process.exit(1);
    }
    const { dev2prod } = require('./lib/dev2prod');
    process.exit(await dev2prod(flags));
  }

  if (command === 'prod2dev') {
    if (!flags.dev || !flags.prod) {
      console.error('prod2dev requires --dev <path> and --prod <path>');
      process.exit(1);
    }
    const { prod2dev } = require('./lib/prod2dev');
    process.exit(await prod2dev(flags));
  }

  if (command === 'prune') {
    if (!flags.dev || !flags.deletelist) {
      console.error('prune requires --dev <path> and --deletelist <file>');
      process.exit(1);
    }
    const { prune } = require('./lib/prune');
    process.exit(await prune(flags));
  }
}

main().catch(err => {
  console.error(err.message);
  // Validation errors (from guards) exit 1, execution errors exit 2
  process.exit(err.isValidation ? 1 : 2);
});
```

**Step 3: Commit**
```bash
git add package.json package-lock.json sync_repo.js
git commit -m "scaffold: sync_repo CLI with arg parsing"
```

---

### Task 2: Shared utilities — pattern loading, path normalization, safety negations, file comparison
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** Create `lib/shared.js`, Create `test/shared.test.js`

**Step 1: Write the failing test**
Create `test/shared.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const {
  SAFETY_NEGATIONS,
  normalizePath,
  parseProdinclude,
  isFileMatch,
  shouldSkipFile,
} = require('../lib/shared');

describe('normalizePath', () => {
  test('converts backslashes to forward slashes', () => {
    assert.strictEqual(normalizePath('src\\utils\\index.js'), 'src/utils/index.js');
  });

  test('strips leading ./', () => {
    assert.strictEqual(normalizePath('./src/index.js'), 'src/index.js');
  });

  test('leaves clean paths unchanged', () => {
    assert.strictEqual(normalizePath('src/index.js'), 'src/index.js');
  });
});

describe('parseProdinclude', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('parses include and negation patterns', async () => {
    await fs.writeFile(path.join(tmpDir, '.prodinclude'), [
      '# comment',
      'src/**',
      'lib/**',
      '',
      '!src/**/*.test.*',
      'README.md',
    ].join('\n'));
    const { includes, negations } = await parseProdinclude(tmpDir);
    assert.deepStrictEqual(includes, ['src/**', 'lib/**', 'README.md']);
    assert.ok(negations.includes('!src/**/*.test.*'));
    // safety negations should be prepended
    SAFETY_NEGATIONS.forEach(neg => {
      assert.ok(negations.includes(`!${neg}`), `missing safety negation: ${neg}`);
    });
  });

  test('throws if .prodinclude missing', async () => {
    await assert.rejects(() => parseProdinclude(tmpDir), /\.prodinclude not found/);
  });
});

describe('isFileMatch', () => {
  test('matches included file', () => {
    assert.strictEqual(isFileMatch('src/index.js', ['src/**'], []), true);
  });

  test('rejects non-included file', () => {
    assert.strictEqual(isFileMatch('dist/bundle.js', ['src/**'], []), false);
  });

  test('negation excludes matched file', () => {
    assert.strictEqual(
      isFileMatch('src/foo.test.js', ['src/**'], ['!src/**/*.test.*']),
      false
    );
  });

  test('safety negation blocks .git', () => {
    const safetyNegs = SAFETY_NEGATIONS.map(s => `!${s}`);
    assert.strictEqual(isFileMatch('.git/config', ['**'], safetyNegs), false);
  });

  test('safety negation blocks node_modules', () => {
    const safetyNegs = SAFETY_NEGATIONS.map(s => `!${s}`);
    assert.strictEqual(isFileMatch('node_modules/foo/index.js', ['**'], safetyNegs), false);
  });
});

describe('shouldSkipFile', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-skip-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('returns false when target does not exist', async () => {
    const src = path.join(tmpDir, 'a.txt');
    const dst = path.join(tmpDir, 'b.txt');
    await fs.writeFile(src, 'hello');
    assert.strictEqual(await shouldSkipFile(src, dst, false), false);
  });

  test('returns true when size and mtime match', async () => {
    const src = path.join(tmpDir, 'a.txt');
    const dst = path.join(tmpDir, 'b.txt');
    await fs.writeFile(src, 'hello');
    await fs.copy(src, dst, { preserveTimestamps: true });
    assert.strictEqual(await shouldSkipFile(src, dst, false), true);
  });

  test('returns false when force is true', async () => {
    const src = path.join(tmpDir, 'a.txt');
    const dst = path.join(tmpDir, 'b.txt');
    await fs.writeFile(src, 'hello');
    await fs.copy(src, dst, { preserveTimestamps: true });
    assert.strictEqual(await shouldSkipFile(src, dst, true), false);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/shared.test.js`
Expected: FAIL — `Cannot find module '../lib/shared'`

**Step 3: Write minimal implementation**
Create `lib/shared.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs-extra');
const micromatch = require('micromatch');

const SAFETY_NEGATIONS = [
  '.git/**',
  '__pycache__/**',
  'node_modules/**',
  '.venv/**',
  '.env',
  '*.pyc',
  '.DS_Store',
  '.prodroot',
  '.prod_deletes',
];

/**
 * Normalize a relative path to forward slashes, no leading ./
 * @param {string} p - relative path
 * @returns {string} normalized path
 * @example normalizePath('src\\utils\\index.js') => 'src/utils/index.js'
 */
function normalizePath(p) {
  let normalized = p.replace(/\\/g, '/');
  if (normalized.startsWith('./')) normalized = normalized.slice(2);
  return normalized;
}

/**
 * Parse .prodinclude file into include and negation pattern arrays.
 * Safety negations are prepended to the negation list.
 * @param {string} rootDir - directory containing .prodinclude
 * @returns {Promise<{includes: string[], negations: string[]}>}
 */
async function parseProdinclude(rootDir) {
  const filePath = path.join(rootDir, '.prodinclude');
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`.prodinclude not found in ${rootDir}`);
  }
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const includes = [];
  const negations = SAFETY_NEGATIONS.map(s => `!${s}`);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('!')) {
      negations.push(line);
    } else {
      includes.push(line);
    }
  }

  return { includes, negations };
}

/**
 * Check if a relative path matches the include patterns and is not negated.
 * @param {string} relPath - normalized relative path
 * @param {string[]} includes - include glob patterns
 * @param {string[]} negations - negation patterns (prefixed with !)
 * @returns {boolean}
 */
function isFileMatch(relPath, includes, negations) {
  if (!micromatch.isMatch(relPath, includes)) return false;
  const negPatterns = negations.map(n => n.slice(1)); // strip leading !
  if (micromatch.isMatch(relPath, negPatterns)) return false;
  return true;
}

/**
 * Check if a file copy can be skipped (target exists and is unchanged).
 * @param {string} srcPath - absolute source file path
 * @param {string} dstPath - absolute destination file path
 * @param {boolean} force - if true, never skip
 * @returns {Promise<boolean>}
 */
async function shouldSkipFile(srcPath, dstPath, force) {
  if (force) return false;
  if (!(await fs.pathExists(dstPath))) return false;
  const [srcStat, dstStat] = await Promise.all([fs.stat(srcPath), fs.stat(dstPath)]);
  return srcStat.size === dstStat.size && srcStat.mtimeMs === dstStat.mtimeMs;
}

module.exports = {
  SAFETY_NEGATIONS,
  normalizePath,
  parseProdinclude,
  isFileMatch,
  shouldSkipFile,
};
```

**Step 4: Run test to verify it passes**
Run: `node --test test/shared.test.js`
Expected: PASS — all tests green

**Step 5: Commit**
```bash
git add lib/shared.js test/shared.test.js
git commit -m "feat: shared utilities — pattern matching, path normalization, safety negations"
```

---

### Task 3: File tree walker
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** Create `lib/walker.js`, Create `test/walker.test.js`

**Step 1: Write the failing test**
Create `test/walker.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { walkTree } = require('../lib/walker');

describe('walkTree', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-test-'));
    await fs.outputFile(path.join(tmpDir, 'src/index.js'), 'code');
    await fs.outputFile(path.join(tmpDir, 'src/utils/helper.js'), 'code');
    await fs.outputFile(path.join(tmpDir, 'node_modules/foo/index.js'), 'code');
    await fs.outputFile(path.join(tmpDir, '.git/config'), 'git');
    await fs.outputFile(path.join(tmpDir, 'README.md'), 'readme');
    await fs.outputFile(path.join(tmpDir, '.env'), 'secret');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('returns normalized relative paths', async () => {
    const files = await walkTree(tmpDir);
    assert.ok(files.includes('src/index.js'));
    assert.ok(files.includes('src/utils/helper.js'));
    assert.ok(files.includes('README.md'));
  });

  test('includes all files when no safety filter', async () => {
    const files = await walkTree(tmpDir);
    assert.ok(files.length >= 5);
  });

  test('filters out safety-negated paths when filter provided', async () => {
    const { SAFETY_NEGATIONS } = require('../lib/shared');
    const files = await walkTree(tmpDir, SAFETY_NEGATIONS);
    assert.ok(!files.some(f => f.startsWith('.git/')));
    assert.ok(!files.some(f => f.startsWith('node_modules/')));
    assert.ok(!files.includes('.env'));
    assert.ok(files.includes('src/index.js'));
    assert.ok(files.includes('README.md'));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/walker.test.js`
Expected: FAIL — `Cannot find module '../lib/walker'`

**Step 3: Write minimal implementation**
Create `lib/walker.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs-extra');
const micromatch = require('micromatch');
const { normalizePath } = require('./shared');

/**
 * Recursively walk a directory tree and return normalized relative paths.
 * Optionally prune directories matching safety patterns.
 * @param {string} rootDir - absolute path to walk
 * @param {string[]} [prunePatterns] - glob patterns to exclude (without ! prefix)
 * @returns {Promise<string[]>} sorted array of normalized relative file paths
 */
async function walkTree(rootDir, prunePatterns) {
  const results = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = normalizePath(path.relative(rootDir, fullPath));

      if (prunePatterns) {
        if (entry.isDirectory()) {
          const dirPath = relPath + '/';
          if (micromatch.isMatch(dirPath, prunePatterns) || micromatch.isMatch(relPath, prunePatterns)) {
            continue;
          }
        } else {
          if (micromatch.isMatch(relPath, prunePatterns)) {
            continue;
          }
        }
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        results.push(relPath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

module.exports = { walkTree };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/walker.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/walker.js test/walker.test.js
git commit -m "feat: recursive file tree walker with safety pattern pruning"
```

---

### Task 4: Direction guards — marker validation
**Mode:** standard
**Skills:** [test-driven-development]
**Files:** Create `lib/guards.js`, Create `test/guards.test.js`

**Step 1: Write the failing test**
Create `test/guards.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { validateDev2Prod, validateProd2Dev } = require('../lib/guards');

describe('validateDev2Prod', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('passes when dev has .prodinclude and prod has .prodroot', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await assert.doesNotReject(() => validateDev2Prod(devDir, prodDir));
  });

  test('passes when dev has .prodinclude and prod is empty (new)', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.doesNotReject(() => validateDev2Prod(devDir, prodDir));
  });

  test('fails when dev is missing .prodinclude', async () => {
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /\.prodinclude/);
  });

  test('fails when dev has .prodroot (reversed)', async () => {
    await fs.writeFile(path.join(devDir, '.prodroot'), '');
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /prod folder/);
  });

  test('fails when prod has .prodinclude (reversed)', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await fs.writeFile(path.join(prodDir, '.prodinclude'), 'src/**');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /dev folder/);
  });
});

describe('validateProd2Dev', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('passes when prod has .prodroot and dev has .prodinclude', async () => {
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.doesNotReject(() => validateProd2Dev(devDir, prodDir));
  });

  test('fails when prod missing .prodroot', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.rejects(() => validateProd2Dev(devDir, prodDir), /\.prodroot/);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/guards.test.js`
Expected: FAIL — `Cannot find module '../lib/guards'`

**Step 3: Write minimal implementation**
Create `lib/guards.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs-extra');

/**
 * Validate directory markers for dev2prod sync.
 * @param {string} devDir - absolute dev path
 * @param {string} prodDir - absolute prod path
 * @throws {Error} if validation fails
 */
async function validateDev2Prod(devDir, prodDir) {
  const devHasProdinclude = await fs.pathExists(path.join(devDir, '.prodinclude'));
  const devHasProdroot = await fs.pathExists(path.join(devDir, '.prodroot'));
  const prodHasProdroot = await fs.pathExists(path.join(prodDir, '.prodroot'));
  const prodHasProdinclude = await fs.pathExists(path.join(prodDir, '.prodinclude'));

  if (devHasProdroot) {
    const err = new Error(`--dev path "${devDir}" contains .prodroot — this looks like a prod folder. Did you mean prod2dev?`);
    err.isValidation = true;
    throw err;
  }
  if (prodHasProdinclude) {
    const err = new Error(`--prod path "${prodDir}" contains .prodinclude — this looks like a dev folder. Did you mean to swap --dev and --prod?`);
    err.isValidation = true;
    throw err;
  }
  if (!devHasProdinclude) {
    const err = new Error(`--dev path "${devDir}" is missing .prodinclude. Create one to define which files ship to prod.`);
    err.isValidation = true;
    throw err;
  }
  // prod can be empty (new) or have .prodroot — both OK
}

/**
 * Validate directory markers for prod2dev sync.
 * @param {string} devDir - absolute dev path
 * @param {string} prodDir - absolute prod path
 * @throws {Error} if validation fails
 */
async function validateProd2Dev(devDir, prodDir) {
  const devHasProdinclude = await fs.pathExists(path.join(devDir, '.prodinclude'));
  const prodHasProdroot = await fs.pathExists(path.join(prodDir, '.prodroot'));

  if (!prodHasProdroot) {
    const err = new Error(`--prod path "${prodDir}" is missing .prodroot. Is this a prod folder? Run dev2prod first to initialize it.`);
    err.isValidation = true;
    throw err;
  }
  if (!devHasProdinclude) {
    const err = new Error(`--dev path "${devDir}" is missing .prodinclude. Is this the dev folder?`);
    err.isValidation = true;
    throw err;
  }
}

module.exports = { validateDev2Prod, validateProd2Dev };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/guards.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/guards.js test/guards.test.js
git commit -m "feat: direction guards with marker file validation"
```

---

### Task 5: dev2prod command
**Mode:** full
**Skills:** [test-driven-development]
**Files:** Create `lib/dev2prod.js`, Create `test/dev2prod.test.js`

**Step 1: Write the failing test**
Create `test/dev2prod.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { dev2prod } = require('../lib/dev2prod');

describe('dev2prod', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
    // Set up dev structure
    await fs.outputFile(path.join(devDir, 'src/index.js'), 'main code');
    await fs.outputFile(path.join(devDir, 'src/app.test.js'), 'test code');
    await fs.outputFile(path.join(devDir, 'lib/utils.js'), 'utils');
    await fs.outputFile(path.join(devDir, 'README.md'), 'readme');
    await fs.outputFile(path.join(devDir, 'node_modules/foo/index.js'), 'dep');
    await fs.outputFile(path.join(devDir, '.env'), 'SECRET=123');
    await fs.outputFile(path.join(devDir, '.git/config'), 'git config');
    await fs.writeFile(path.join(devDir, '.prodinclude'), [
      'src/**',
      'lib/**',
      'README.md',
      '!src/**/*.test.*',
    ].join('\n'));
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('copies only allowlisted files to prod', async () => {
    const code = await dev2prod({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(prodDir, 'src/index.js')));
    assert.ok(await fs.pathExists(path.join(prodDir, 'lib/utils.js')));
    assert.ok(await fs.pathExists(path.join(prodDir, 'README.md')));
    // negated and safety
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'src/app.test.js'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'node_modules'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, '.env'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, '.git'))));
  });

  test('creates .prodroot marker', async () => {
    await dev2prod({ dev: devDir, prod: prodDir });
    assert.ok(await fs.pathExists(path.join(prodDir, '.prodroot')));
  });

  test('mirror deletes stale files in prod', async () => {
    // Pre-populate prod with a stale file
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await fs.outputFile(path.join(prodDir, 'old_file.js'), 'stale');
    await dev2prod({ dev: devDir, prod: prodDir, mirror: true });
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'old_file.js'))));
  });

  test('dry-run does not write files', async () => {
    await dev2prod({ dev: devDir, prod: prodDir, dryRun: true });
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'src/index.js'))));
  });

  test('skips unchanged files', async () => {
    await dev2prod({ dev: devDir, prod: prodDir });
    const stat1 = await fs.stat(path.join(prodDir, 'src/index.js'));
    await dev2prod({ dev: devDir, prod: prodDir });
    const stat2 = await fs.stat(path.join(prodDir, 'src/index.js'));
    // mtime should not change on second run
    assert.strictEqual(stat1.mtimeMs, stat2.mtimeMs);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/dev2prod.test.js`
Expected: FAIL — `Cannot find module '../lib/dev2prod'`

**Step 3: Write minimal implementation**
Create `lib/dev2prod.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs-extra');
const { parseProdinclude, isFileMatch, shouldSkipFile, SAFETY_NEGATIONS } = require('./shared');
const { walkTree } = require('./walker');
const { validateDev2Prod } = require('./guards');

/**
 * Sync from dev to prod, filtered by .prodinclude allowlist.
 * @param {object} flags
 * @param {string} flags.dev - absolute dev path
 * @param {string} flags.prod - absolute prod path
 * @param {boolean} [flags.mirror] - delete stale files in prod
 * @param {boolean} [flags.force] - force copy even if unchanged
 * @param {boolean} [flags.dryRun] - print plan without writing
 * @param {boolean} [flags.verbose] - print every action
 * @returns {Promise<number>} exit code
 */
async function dev2prod(flags) {
  const { dev, prod, mirror, force, dryRun, verbose } = flags;

  await validateDev2Prod(dev, prod);
  const { includes, negations } = await parseProdinclude(dev);

  // Walk dev tree, pruning safety dirs for performance
  const devFiles = await walkTree(dev, SAFETY_NEGATIONS);

  // Plan copies
  const toCopy = [];
  let skipped = 0;

  for (const relPath of devFiles) {
    if (!isFileMatch(relPath, includes, negations)) continue;
    const srcPath = path.join(dev, relPath);
    const dstPath = path.join(prod, relPath);
    if (await shouldSkipFile(srcPath, dstPath, force)) {
      skipped++;
      if (verbose) console.log(`  SKIP    ${relPath} (unchanged)`);
      continue;
    }
    toCopy.push({ relPath, srcPath, dstPath });
  }

  // Plan mirror deletions
  const toDelete = [];
  if (mirror) {
    const prodFiles = await walkTree(prod, SAFETY_NEGATIONS);
    const allowedSet = new Set(toCopy.map(f => f.relPath));
    // Also include skipped (unchanged) files in the kept set
    for (const relPath of devFiles) {
      if (isFileMatch(relPath, includes, negations)) allowedSet.add(relPath);
    }
    for (const relPath of prodFiles) {
      if (!allowedSet.has(relPath)) {
        toDelete.push(path.join(prod, relPath));
        if (verbose || dryRun) console.log(`  ${dryRun ? 'WOULD DELETE' : 'DELETE'} ${relPath}`);
      }
    }
  }

  // Print plan
  if (verbose || dryRun) {
    for (const { relPath } of toCopy) {
      console.log(`  ${dryRun ? 'WOULD COPY' : 'COPY'}   ${relPath}`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] sync_repo dev2prod`);
    console.log(`  Would copy:   ${toCopy.length} files`);
    console.log(`  Skipped:      ${skipped} files (unchanged)`);
    console.log(`  Would delete: ${toDelete.length} files`);
    return 0;
  }

  // Execute
  let errors = 0;
  for (const { relPath, srcPath, dstPath } of toCopy) {
    try {
      await fs.ensureDir(path.dirname(dstPath));
      await fs.copy(srcPath, dstPath, { preserveTimestamps: true });
    } catch (err) {
      console.error(`  ERROR copying ${relPath}: ${err.message}`);
      errors++;
    }
  }

  for (const fullPath of toDelete) {
    try {
      await fs.remove(fullPath);
    } catch (err) {
      console.error(`  ERROR deleting ${fullPath}: ${err.message}`);
      errors++;
    }
  }

  // Create .prodroot if not present
  const prodrootPath = path.join(prod, '.prodroot');
  if (!(await fs.pathExists(prodrootPath))) {
    await fs.writeFile(prodrootPath, '');
  }

  // Summary
  console.log(`\nsync_repo dev2prod complete`);
  console.log(`  Copied:  ${toCopy.length} files`);
  console.log(`  Skipped: ${skipped} files (unchanged)`);
  console.log(`  Deleted: ${toDelete.length} files (mirror)`);
  console.log(`  Errors:  ${errors}`);

  return errors > 0 ? 2 : 0;
}

module.exports = { dev2prod };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/dev2prod.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/dev2prod.js test/dev2prod.test.js
git commit -m "feat: dev2prod command — allowlist-filtered sync with mirror support"
```

---

### Task 6: prod2dev command
**Mode:** full
**Skills:** [test-driven-development]
**Files:** Create `lib/prod2dev.js`, Create `test/prod2dev.test.js`

**Step 1: Write the failing test**
Create `test/prod2dev.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { prod2dev } = require('../lib/prod2dev');

describe('prod2dev', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
    // Dev has .prodinclude and some files
    await fs.writeFile(path.join(devDir, '.prodinclude'), [
      'src/**',
      'lib/**',
      'README.md',
    ].join('\n'));
    await fs.outputFile(path.join(devDir, 'src/index.js'), 'old dev code');
    await fs.outputFile(path.join(devDir, 'src/extra.js'), 'dev only but allowlisted');
    await fs.outputFile(path.join(devDir, 'lib/utils.js'), 'old utils');
    await fs.outputFile(path.join(devDir, 'README.md'), 'old readme');
    // Prod has .prodroot and updated files
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await fs.outputFile(path.join(prodDir, 'src/index.js'), 'new prod code');
    await fs.outputFile(path.join(prodDir, 'lib/utils.js'), 'new utils');
    await fs.outputFile(path.join(prodDir, 'README.md'), 'new readme');
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('copies prod files to dev', async () => {
    const code = await prod2dev({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/index.js'), 'utf8'), 'new prod code');
    assert.strictEqual(await fs.readFile(path.join(devDir, 'lib/utils.js'), 'utf8'), 'new utils');
  });

  test('does not copy .prodroot to dev', async () => {
    await prod2dev({ dev: devDir, prod: prodDir });
    assert.ok(!(await fs.pathExists(path.join(devDir, '.prodroot'))));
  });

  test('emits .prod_deletes for allowlisted files missing from prod', async () => {
    await prod2dev({ dev: devDir, prod: prodDir });
    const deleteFile = path.join(devDir, '.prod_deletes');
    assert.ok(await fs.pathExists(deleteFile));
    const content = await fs.readFile(deleteFile, 'utf8');
    assert.ok(content.includes('src/extra.js'));
  });

  test('dry-run does not write files', async () => {
    await prod2dev({ dev: devDir, prod: prodDir, dryRun: true });
    // dev should still have old content
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/index.js'), 'utf8'), 'old dev code');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/prod2dev.test.js`
Expected: FAIL — `Cannot find module '../lib/prod2dev'`

**Step 3: Write minimal implementation**
Create `lib/prod2dev.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs-extra');
const { SAFETY_NEGATIONS, parseProdinclude, isFileMatch, shouldSkipFile } = require('./shared');
const { walkTree } = require('./walker');
const { validateProd2Dev } = require('./guards');

/**
 * Sync from prod to dev. Copies all prod files, emits .prod_deletes for missing allowlisted files.
 * @param {object} flags
 * @param {string} flags.dev - absolute dev path
 * @param {string} flags.prod - absolute prod path
 * @param {boolean} [flags.force] - force copy even if unchanged
 * @param {boolean} [flags.dryRun] - print plan without writing
 * @param {boolean} [flags.verbose] - print every action
 * @returns {Promise<number>} exit code
 */
async function prod2dev(flags) {
  const { dev, prod, force, dryRun, verbose } = flags;

  await validateProd2Dev(dev, prod);

  // Walk prod, excluding safety negations (e.g. .prodroot)
  const prodFiles = await walkTree(prod, SAFETY_NEGATIONS);

  // Plan copies
  const toCopy = [];
  let skipped = 0;

  for (const relPath of prodFiles) {
    const srcPath = path.join(prod, relPath);
    const dstPath = path.join(dev, relPath);
    if (await shouldSkipFile(srcPath, dstPath, force)) {
      skipped++;
      if (verbose) console.log(`  SKIP    ${relPath} (unchanged)`);
      continue;
    }
    toCopy.push({ relPath, srcPath, dstPath });
  }

  // Find delete candidates: allowlisted files in dev that are missing from prod
  const { includes, negations } = await parseProdinclude(dev);
  const devFiles = await walkTree(dev, SAFETY_NEGATIONS);
  const prodFileSet = new Set(prodFiles);
  const deleteCandidates = [];

  for (const relPath of devFiles) {
    if (!isFileMatch(relPath, includes, negations)) continue;
    if (!prodFileSet.has(relPath)) {
      deleteCandidates.push(relPath);
    }
  }

  if (verbose || dryRun) {
    for (const { relPath } of toCopy) {
      console.log(`  ${dryRun ? 'WOULD COPY' : 'COPY'}   ${relPath}`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] sync_repo prod2dev`);
    console.log(`  Would copy:       ${toCopy.length} files`);
    console.log(`  Skipped:          ${skipped} files (unchanged)`);
    console.log(`  Delete candidates: ${deleteCandidates.length} files`);
    if (deleteCandidates.length > 0) {
      console.log(`  Would write .prod_deletes with ${deleteCandidates.length} entries`);
    }
    return 0;
  }

  // Execute copies
  let errors = 0;
  for (const { relPath, srcPath, dstPath } of toCopy) {
    try {
      await fs.ensureDir(path.dirname(dstPath));
      await fs.copy(srcPath, dstPath, { preserveTimestamps: true });
    } catch (err) {
      console.error(`  ERROR copying ${relPath}: ${err.message}`);
      errors++;
    }
  }

  // Write .prod_deletes
  if (deleteCandidates.length > 0) {
    const deleteListPath = path.join(dev, '.prod_deletes');
    const content = [
      '# Files in dev (allowlisted) but missing from prod',
      '# Review this list, then run: node sync_repo.js prune --dev <path> --deletelist .prod_deletes',
      '# Remove lines for files you want to keep.',
      '',
      ...deleteCandidates,
      '',
    ].join('\n');
    await fs.writeFile(deleteListPath, content);
  }

  // Summary
  console.log(`\nsync_repo prod2dev complete`);
  console.log(`  Copied:            ${toCopy.length} files`);
  console.log(`  Skipped:           ${skipped} files (unchanged)`);
  console.log(`  Errors:            ${errors}`);
  if (deleteCandidates.length > 0) {
    console.log(`  Delete candidates: ${deleteCandidates.length} (written to .prod_deletes)`);
  }

  return errors > 0 ? 2 : 0;
}

module.exports = { prod2dev };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/prod2dev.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/prod2dev.js test/prod2dev.test.js
git commit -m "feat: prod2dev command — reverse sync with delete candidate list"
```

---

### Task 7: prune command
**Mode:** full
**Skills:** [test-driven-development]
**Files:** Create `lib/prune.js`, Create `test/prune.test.js`

**Step 1: Write the failing test**
Create `test/prune.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { prune } = require('../lib/prune');

describe('prune', () => {
  let devDir, deleteListPath;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prune-'));
    deleteListPath = path.join(devDir, '.prod_deletes');
    await fs.outputFile(path.join(devDir, 'src/old.js'), 'old code');
    await fs.outputFile(path.join(devDir, 'src/keep.js'), 'keep this');
    await fs.outputFile(path.join(devDir, 'lib/deprecated.js'), 'deprecated');
  });

  afterEach(async () => {
    await fs.remove(devDir);
  });

  test('deletes listed files', async () => {
    await fs.writeFile(deleteListPath, 'src/old.js\nlib/deprecated.js\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    assert.ok(!(await fs.pathExists(path.join(devDir, 'src/old.js'))));
    assert.ok(!(await fs.pathExists(path.join(devDir, 'lib/deprecated.js'))));
    assert.ok(await fs.pathExists(path.join(devDir, 'src/keep.js')));
  });

  test('skips comments and blank lines', async () => {
    await fs.writeFile(deleteListPath, '# comment\n\nsrc/old.js\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    assert.ok(!(await fs.pathExists(path.join(devDir, 'src/old.js'))));
  });

  test('removes empty parent dirs', async () => {
    await fs.writeFile(deleteListPath, 'lib/deprecated.js\n');
    await prune({ dev: devDir, deletelist: deleteListPath });
    // lib/ should be removed since it's now empty
    assert.ok(!(await fs.pathExists(path.join(devDir, 'lib'))));
  });

  test('rejects path traversal', async () => {
    await fs.writeFile(deleteListPath, '../etc/passwd\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    // Should not crash, should reject the entry
    assert.strictEqual(code, 0);
    // Nothing should be deleted
    assert.ok(await fs.pathExists(path.join(devDir, 'src/old.js')));
  });

  test('rejects absolute paths', async () => {
    await fs.writeFile(deleteListPath, '/etc/passwd\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
  });

  test('warns on missing files', async () => {
    await fs.writeFile(deleteListPath, 'nonexistent.js\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
  });

  test('rejects symlink escaping dev root', async () => {
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'outside-'));
    await fs.outputFile(path.join(outsideDir, 'secret.txt'), 'do not delete');
    // Create a symlink inside dev pointing outside
    await fs.ensureSymlink(outsideDir, path.join(devDir, 'escape_link'));
    await fs.writeFile(deleteListPath, 'escape_link/secret.txt\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    // The file outside dev should still exist
    assert.ok(await fs.pathExists(path.join(outsideDir, 'secret.txt')));
    await fs.remove(outsideDir);
  });

  test('dry-run does not delete', async () => {
    await fs.writeFile(deleteListPath, 'src/old.js\n');
    await prune({ dev: devDir, deletelist: deleteListPath, dryRun: true });
    assert.ok(await fs.pathExists(path.join(devDir, 'src/old.js')));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/prune.test.js`
Expected: FAIL — `Cannot find module '../lib/prune'`

**Step 3: Write minimal implementation**
Create `lib/prune.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs-extra');
const { normalizePath } = require('./shared');

/**
 * Apply a reviewed delete list to the dev directory.
 * @param {object} flags
 * @param {string} flags.dev - absolute dev path
 * @param {string} flags.deletelist - absolute path to delete list file
 * @param {boolean} [flags.dryRun] - print plan without deleting
 * @returns {Promise<number>} exit code
 */
async function prune(flags) {
  const { dev, deletelist, dryRun } = flags;

  if (!(await fs.pathExists(deletelist))) {
    console.error(`Delete list not found: ${deletelist}`);
    return 1;
  }

  const content = await fs.readFile(deletelist, 'utf8');
  const lines = content.split(/\r?\n/);

  let deleted = 0;
  let skippedMissing = 0;
  let rejected = 0;
  const dirsToCheck = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = normalizePath(line);

    // Reject absolute paths
    if (path.isAbsolute(normalized) || normalized.startsWith('/')) {
      console.error(`  REJECTED (absolute path): ${line}`);
      rejected++;
      continue;
    }

    // Reject path traversal
    if (normalized.includes('..')) {
      console.error(`  REJECTED (path traversal): ${line}`);
      rejected++;
      continue;
    }

    // Resolve and check it stays within dev (including symlink escape)
    const resolved = path.resolve(dev, normalized);
    let realResolved;
    try {
      realResolved = await fs.realpath(resolved);
    } catch {
      // If realpath fails, file doesn't exist — will be caught below
      realResolved = resolved;
    }
    const realDev = await fs.realpath(dev);
    if (!realResolved.startsWith(realDev + path.sep) && realResolved !== realDev) {
      console.error(`  REJECTED (escapes dev root): ${line}`);
      rejected++;
      continue;
    }

    if (!(await fs.pathExists(resolved))) {
      console.warn(`  WARN (not found): ${normalized}`);
      skippedMissing++;
      continue;
    }

    if (dryRun) {
      console.log(`  WOULD DELETE ${normalized}`);
    } else {
      await fs.remove(resolved);
      deleted++;
    }

    // Track parent dir for cleanup
    const parentDir = path.dirname(resolved);
    if (parentDir !== dev) {
      dirsToCheck.add(parentDir);
    }
  }

  // Remove empty parent dirs (deepest first)
  if (!dryRun) {
    const sortedDirs = [...dirsToCheck].sort((a, b) => b.length - a.length);
    for (const dir of sortedDirs) {
      // Only remove if within dev and empty
      const dirNorm = path.normalize(dir);
      const devNorm = path.normalize(dev);
      if (!dirNorm.startsWith(devNorm + path.sep)) continue;
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
        }
      } catch {
        // dir may already be removed, ignore
      }
    }
  }

  // Summary
  console.log(`\nsync_repo prune complete`);
  console.log(`  Deleted:  ${deleted}`);
  console.log(`  Missing:  ${skippedMissing}`);
  console.log(`  Rejected: ${rejected}`);

  return 0;
}

module.exports = { prune };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/prune.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add lib/prune.js test/prune.test.js
git commit -m "feat: prune command — safe delete-list execution with path validation"
```

---

### Task 8: Integration test — full round-trip
**Mode:** full
**Skills:** [test-driven-development]
**Files:** Create `test/integration.test.js`

**Step 1: Write the failing test**
Create `test/integration.test.js`:
```js
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { dev2prod } = require('../lib/dev2prod');
const { prod2dev } = require('../lib/prod2dev');
const { prune } = require('../lib/prune');

describe('integration: full round-trip', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'int-dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'int-prod-'));

    await fs.writeFile(path.join(devDir, '.prodinclude'), [
      'src/**',
      'README.md',
      '!src/**/*.test.*',
    ].join('\n'));
    await fs.outputFile(path.join(devDir, 'src/index.js'), 'v1');
    await fs.outputFile(path.join(devDir, 'src/app.test.js'), 'test');
    await fs.outputFile(path.join(devDir, 'README.md'), 'readme v1');
    await fs.outputFile(path.join(devDir, '.env'), 'SECRET');
    await fs.outputFile(path.join(devDir, 'node_modules/x/i.js'), 'dep');
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('dev2prod → modify in prod → prod2dev → prune', async () => {
    // Step 1: dev2prod
    let code = await dev2prod({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(prodDir, 'src/index.js')));
    assert.ok(await fs.pathExists(path.join(prodDir, '.prodroot')));
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'src/app.test.js'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, '.env'))));

    // Step 2: Simulate changes in prod (as if pulled from remote)
    await fs.writeFile(path.join(prodDir, 'src/index.js'), 'v2 from remote');
    await fs.outputFile(path.join(prodDir, 'src/new_file.js'), 'new from remote');
    // Remove README from prod (simulating upstream deletion)
    await fs.remove(path.join(prodDir, 'README.md'));

    // Step 3: prod2dev
    code = await prod2dev({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/index.js'), 'utf8'), 'v2 from remote');
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/new_file.js'), 'utf8'), 'new from remote');

    // .prod_deletes should list README.md
    const deleteList = path.join(devDir, '.prod_deletes');
    assert.ok(await fs.pathExists(deleteList));
    const deleteContent = await fs.readFile(deleteList, 'utf8');
    assert.ok(deleteContent.includes('README.md'));

    // Step 4: prune
    code = await prune({ dev: devDir, deletelist: deleteList });
    assert.strictEqual(code, 0);
    assert.ok(!(await fs.pathExists(path.join(devDir, 'README.md'))));

    // Dev-only files should still exist
    assert.ok(await fs.pathExists(path.join(devDir, 'src/app.test.js')));
    assert.ok(await fs.pathExists(path.join(devDir, '.env')));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/integration.test.js`
Expected: PASS (all modules already implemented — this validates the round-trip)

**Step 3: No new implementation needed — this is a validation task**

**Step 4: Run all tests**
Run: `node --test test/*.test.js`
Expected: ALL PASS

**Step 5: Commit**
```bash
git add test/integration.test.js
git commit -m "test: integration test for full dev2prod → prod2dev → prune round-trip"
```
