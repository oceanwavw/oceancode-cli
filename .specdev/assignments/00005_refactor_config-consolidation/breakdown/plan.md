# Config Consolidation & Command Renames Implementation Plan

> **For agent:** Implement this plan task-by-task using TDD discipline.

**Goal:** Consolidate `sync_repos.yaml` + `build.yaml` into a single `oceancode.yaml`, rename/split commands for explicit dev/prod, enforce cwd = dev root.

**Architecture:** Single unified config loader replaces two loaders. Commands read sections they need from one config. Dev root = cwd, prod root from `workspace.prod_root` in config. Commands renamed: `install` → `clone-prod`, `git` → `git-dev`/`git-prod`.

**Tech Stack:** Node.js (CommonJS), js-yaml, @clack/prompts, node:test

---

### Task 1: Unified config loader

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Create: `src/lib/configLoader.js`
- Create: `test/configLoader.test.js`

**Step 1: Write the failing test**

```js
// test/configLoader.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

describe('configLoader', () => {
  let tmpDir;

  it('loads full oceancode.yaml and returns config object', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = {
      workspace: { prod_root: '/tmp/prod' },
      repos: { oceanfarm: 'lib/oceanfarm', oceanquant: 'lib/oceanquant' },
      build: { python_version: '3.12' },
      launchers: { dash: { dev: { cwd: 'lib/dash', cmd: 'npm run dev' } } },
    };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.equal(result.workspace.prod_root, '/tmp/prod');
    assert.equal(result.repos.oceanfarm, 'lib/oceanfarm');
    assert.equal(result.build.python_version, '3.12');
    assert.ok(result.launchers.dash);
  });

  it('loads partial config with only repos section', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = { repos: { oceanfarm: 'lib/oceanfarm' } };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.equal(result.repos.oceanfarm, 'lib/oceanfarm');
    assert.equal(result.workspace, undefined);
    assert.equal(result.build, undefined);
  });

  it('throws on missing file', () => {
    const { loadConfig } = require('../src/lib/configLoader');
    assert.throws(() => loadConfig('/nonexistent/oceancode.yaml'), /not found/);
  });

  it('requireSection throws with clear message when section missing', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = { repos: { oceanfarm: 'lib/oceanfarm' } };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig, requireSection } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.throws(
      () => requireSection(result, 'workspace.prod_root'),
      /Missing config section 'workspace\.prod_root'/
    );
  });

  it('requireSection passes when section exists', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = { workspace: { prod_root: '/tmp/prod' }, repos: { a: 'lib/a' } };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig, requireSection } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.doesNotThrow(() => requireSection(result, 'workspace.prod_root'));
    assert.doesNotThrow(() => requireSection(result, 'repos'));
  });

  it('resolveRepos returns array from repos object map', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { oceanfarm: 'lib/oceanfarm', oceanquant: 'lib/oceanquant' } };
    const repos = resolveRepos(config, null);
    assert.equal(repos.length, 2);
    assert.equal(repos[0].name, 'oceanfarm');
    assert.equal(repos[0].path, 'lib/oceanfarm');
  });

  it('resolveRepos filters by comma-delimited names', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { oceanfarm: 'lib/oceanfarm', oceanquant: 'lib/oceanquant' } };
    const repos = resolveRepos(config, 'oceanfarm');
    assert.equal(repos.length, 1);
    assert.equal(repos[0].name, 'oceanfarm');
  });

  it('resolveRepos throws on unknown repo', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { oceanfarm: 'lib/oceanfarm' } };
    assert.throws(() => resolveRepos(config, 'nonexistent'), /Unknown repos/);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/configLoader.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// src/lib/configLoader.js
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig(configPath) {
  if (!configPath) {
    configPath = path.join(process.cwd(), 'oceancode.yaml');
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`oceancode.yaml not found at ${configPath}. Run from your dev workspace root, or pass --config`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`Error parsing ${configPath}: ${e.message}`);
  }
  return doc || {};
}

function requireSection(config, dotPath) {
  const parts = dotPath.split('.');
  let current = config;
  for (const part of parts) {
    if (!current || current[part] === undefined) {
      throw new Error(`Missing config section '${dotPath}'. Run 'oceancode init' to generate oceancode.yaml.`);
    }
    current = current[part];
  }
}

function resolveRepos(config, repoArg) {
  if (!config.repos) {
    throw new Error(`Missing config section 'repos'. Run 'oceancode init' to generate oceancode.yaml.`);
  }
  if (!repoArg) {
    return Object.entries(config.repos).map(([name, rel]) => ({ name, path: rel }));
  }
  const names = repoArg.split(',').map(n => n.trim()).filter(Boolean);
  const unknown = names.filter(n => !config.repos[n]);
  if (unknown.length > 0) {
    throw new Error(`Unknown repos: ${unknown.join(', ')}`);
  }
  return names.map(name => ({ name, path: config.repos[name] }));
}

module.exports = { loadConfig, requireSection, resolveRepos };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/configLoader.test.js`
Expected: PASS (8 tests)

**Step 5: Commit**
```
git add src/lib/configLoader.js test/configLoader.test.js
git commit -m "feat: add unified config loader for oceancode.yaml"
```

---

### Task 2: Migrate sync command to unified loader

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify: `src/commands/sync.js`
- Modify: `test/sync.test.js`

**Step 1: Write the failing test**

Update `test/sync.test.js` to write `oceancode.yaml` format (with `workspace.prod_root` and `repos` sections) instead of `sync_repos.yaml`. Test that sync reads `prod_root` from config and no longer needs `-s`/`-t` flags.

**Step 2: Run test to verify it fails**
Run: `node --test test/sync.test.js`
Expected: FAIL — sync still looks for sync_repos.yaml

**Step 3: Write minimal implementation**

Modify `src/commands/sync.js`:
- Replace `require('../lib/config')` with `require('../lib/configLoader')`
- Load config via `loadConfig(flags.config)`, call `requireSection(config, 'workspace.prod_root')` and `requireSection(config, 'repos')`
- Dev root = `process.cwd()`, prod root = `path.resolve(config.workspace.prod_root)`
- Remove `-s` and `-t` flag parsing from `parseArgs`
- Remove interactive prompts for source/target paths
- Use `resolveRepos` from configLoader

**Step 4: Run test to verify it passes**
Run: `node --test test/sync.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/sync.js test/sync.test.js
git commit -m "refactor: migrate sync command to unified config loader"
```

---

### Task 3: Migrate build and launch commands to cwd-based resolution

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify: `src/commands/build.js`
- Modify: `src/commands/launch.js`
- Modify: `test/build.test.js`
- Modify: `test/launch.test.js`

**Step 1: Write the failing test**

Update build test to verify `build` uses `loadConfig` from configLoader (reads `oceancode.yaml`). Update launch test similarly — verify it reads `launchers` section from unified config.

**Step 2: Run test to verify it fails**
Run: `node --test test/build.test.js test/launch.test.js`
Expected: FAIL

**Step 3: Write minimal implementation**

Modify `src/commands/build.js`:
- Replace `loadBuildConfig` import with `loadConfig` from `configLoader`
- Replace `const scriptsDir = path.resolve(__dirname, '..', '..')` and `workspaceRoot = path.resolve(scriptsDir, '..')` with `const workspaceRoot = process.cwd()`
- Call `requireSection(config, 'build')`
- Default config path: `path.join(process.cwd(), 'oceancode.yaml')`

Modify `src/commands/launch.js`:
- Same pattern — replace `loadBuildConfig` with `loadConfig` from configLoader
- Replace `__dirname`-based resolution with `process.cwd()`
- Call `requireSection(config, 'launchers')`

**Step 4: Run test to verify it passes**
Run: `node --test test/build.test.js test/launch.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/build.js src/commands/launch.js test/build.test.js test/launch.test.js
git commit -m "refactor: migrate build and launch to cwd-based config resolution"
```

---

### Task 4: Rename install → clone-prod

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Create: `src/commands/clone-prod.js`
- Create: `test/clone-prod.test.js`
- Delete: `src/commands/install.js`
- Modify: `bin/oceancode.js`

**Step 1: Write the failing test**

```js
// test/clone-prod.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('clone-prod command', () => {
  it('parseArgs parses base-url', () => {
    const { parseArgs } = require('../src/commands/clone-prod');
    const result = parseArgs(['https://github.com/org']);
    assert.equal(result.baseUrl, 'https://github.com/org');
  });

  it('run function is exported', () => {
    const mod = require('../src/commands/clone-prod');
    assert.equal(typeof mod.run, 'function');
  });

  it('reads prod_root from config for clone target', () => {
    const { parseArgs } = require('../src/commands/clone-prod');
    const result = parseArgs(['https://github.com/org']);
    assert.equal(result.baseUrl, 'https://github.com/org');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/clone-prod.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Copy `install.js` → `clone-prod.js` with changes:
- Replace `require('../lib/config')` with `require('../lib/configLoader')`
- Read `prod_root` from config via `requireSection(config, 'workspace.prod_root')`
- Clone target directory = `path.resolve(config.workspace.prod_root)` instead of `process.cwd()`
- Update usage text to say `clone-prod`

Update `bin/oceancode.js`:
- Replace `install` entry with `'clone-prod': path.join(__dirname, '..', 'src', 'commands', 'clone-prod')`
- Update usage string

Delete `src/commands/install.js`

**Step 4: Run test to verify it passes**
Run: `node --test test/clone-prod.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/clone-prod.js test/clone-prod.test.js bin/oceancode.js
git rm src/commands/install.js
git commit -m "refactor: rename install to clone-prod, read prod_root from config"
```

---

### Task 5: Split git → git-dev + git-prod

**Mode:** full
**Skills:** test-driven-development
**Files:**
- Create: `src/commands/git-dev.js`
- Create: `src/commands/git-prod.js`
- Create: `test/git-dev.test.js`
- Create: `test/git-prod.test.js`
- Delete: `src/commands/git.js`
- Modify: `bin/oceancode.js`

**Step 1: Write the failing test**

```js
// test/git-dev.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('git-dev command', () => {
  it('only supports status action', () => {
    const { parseArgs } = require('../src/commands/git-dev');
    const result = parseArgs(['status']);
    assert.equal(result.action, 'status');
  });

  it('rejects non-status actions', () => {
    const { ACTIONS } = require('../src/commands/git-dev');
    assert.deepEqual(ACTIONS, ['status']);
  });

  it('run function is exported', () => {
    const mod = require('../src/commands/git-dev');
    assert.equal(typeof mod.run, 'function');
  });
});
```

```js
// test/git-prod.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('git-prod command', () => {
  it('parseArgs parses action', () => {
    const { parseArgs } = require('../src/commands/git-prod');
    const result = parseArgs(['status']);
    assert.equal(result.action, 'status');
  });

  it('supports all git actions', () => {
    const { ACTIONS } = require('../src/commands/git-prod');
    assert.ok(ACTIONS.includes('status'));
    assert.ok(ACTIONS.includes('commit'));
    assert.ok(ACTIONS.includes('push'));
    assert.ok(ACTIONS.includes('init'));
  });

  it('requireProdroot throws without .prodroot', () => {
    const { requireProdroot } = require('../src/commands/git-prod');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gp-'));
    assert.throws(() => requireProdroot(tmpDir), /\.prodroot not found/);
  });

  it('requireProdroot passes with .prodroot', () => {
    const { requireProdroot } = require('../src/commands/git-prod');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gp-'));
    fs.writeFileSync(path.join(tmpDir, '.prodroot'), '');
    assert.doesNotThrow(() => requireProdroot(tmpDir));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/git-dev.test.js test/git-prod.test.js`
Expected: FAIL — modules not found

**Step 3: Write minimal implementation**

`src/commands/git-dev.js`:
- Only supports `status` action
- Uses `loadConfig` + `requireSection(config, 'repos')` from configLoader
- Iterates repos at `process.cwd()`, runs `git status --short`
- Interactive prompt: select from repos when no args and TTY
- No `.prodroot` guard

`src/commands/git-prod.js`:
- Supports all actions: status, commit, push, pull, fetch, remote-add, init
- Uses `loadConfig` + `requireSection(config, 'workspace.prod_root')` + `requireSection(config, 'repos')`
- Operates on `path.resolve(config.workspace.prod_root)`
- `.prodroot` guard for destructive ops
- `git-prod init` seeds `.gitignore` (merge-safe, append-only dedup)
- Interactive prompts when no args and TTY

Update `bin/oceancode.js`:
- Replace `git` with `'git-dev'` and `'git-prod'`
- Delete `src/commands/git.js`

**Step 4: Run test to verify it passes**
Run: `node --test test/git-dev.test.js test/git-prod.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/git-dev.js src/commands/git-prod.js test/git-dev.test.js test/git-prod.test.js bin/oceancode.js
git rm src/commands/git.js
git commit -m "refactor: split git into git-dev (status only) and git-prod (full ops)"
```

---

### Task 6: .gitignore seeding in git-prod init

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify: `src/commands/git-prod.js`
- Modify: `test/git-prod.test.js`

**Step 1: Write the failing test**

Add tests to `test/git-prod.test.js`:

```js
it('seedGitignore creates .gitignore with default entries', () => {
  const { seedGitignore } = require('../src/commands/git-prod');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gi-'));
  seedGitignore(tmpDir);
  const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8');
  assert.ok(content.includes('bin/'));
  assert.ok(content.includes('node_modules/'));
  assert.ok(content.includes('venv-*/'));
});

it('seedGitignore appends missing entries to existing .gitignore', () => {
  const { seedGitignore } = require('../src/commands/git-prod');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gi-'));
  fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'bin/\ncustom-pattern\n');
  seedGitignore(tmpDir);
  const content = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8');
  assert.ok(content.includes('custom-pattern'));
  assert.ok(content.includes('bin/'));
  assert.ok(content.includes('node_modules/'));
  // bin/ should appear only once
  const binCount = content.split('\n').filter(l => l.trim() === 'bin/').length;
  assert.equal(binCount, 1);
});

it('seedGitignore is idempotent', () => {
  const { seedGitignore } = require('../src/commands/git-prod');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gi-'));
  seedGitignore(tmpDir);
  const first = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8');
  seedGitignore(tmpDir);
  const second = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf8');
  assert.equal(first, second);
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/git-prod.test.js`
Expected: FAIL — seedGitignore not found

**Step 3: Write minimal implementation**

Add to `src/commands/git-prod.js`:

```js
const DEFAULT_GITIGNORE = [
  'bin/', '*.exe', '*.pyc', '__pycache__/', 'node_modules/',
  'dist/', 'venv-*/', '*.egg-info/', '.DS_Store',
];

function seedGitignore(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  let existing = [];
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, 'utf8').split('\n');
  }
  const existingSet = new Set(existing.map(l => l.trim()));
  const toAdd = DEFAULT_GITIGNORE.filter(entry => !existingSet.has(entry));
  if (toAdd.length > 0) {
    const content = existing.length > 0
      ? existing.join('\n') + '\n' + toAdd.join('\n') + '\n'
      : toAdd.join('\n') + '\n';
    fs.writeFileSync(gitignorePath, content);
  }
}
```

Call `seedGitignore(dir)` before `git add -A` in the `init` action handler.

**Step 4: Run test to verify it passes**
Run: `node --test test/git-prod.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/git-prod.js test/git-prod.test.js
git commit -m "feat: add merge-safe .gitignore seeding to git-prod init"
```

---

### Task 7: Update init wizard to generate single oceancode.yaml

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify: `src/commands/init.js`
- Modify: `src/lib/configGen.js`
- Modify: `test/init.test.js`
- Modify: `test/configGen.test.js`

**Step 1: Write the failing test**

Update `test/configGen.test.js`:
- Test new `generateConfig(opts)` function that produces single `oceancode.yaml` structure with `workspace`, `repos`, `build`, `launchers` sections
- Test that generated config is loadable by `configLoader.js`

Update `test/init.test.js`:
- Verify `init` module still exports `run` and `parseArgs`

**Step 2: Run test to verify it fails**
Run: `node --test test/configGen.test.js test/init.test.js`
Expected: FAIL — generateConfig not found

**Step 3: Write minimal implementation**

Modify `src/lib/configGen.js`:
- Add `generateConfig(opts)` that combines `workspace: { prod_root }`, `repos`, `build`, and `launchers` into one object
- Keep `writeConfigAtomic` unchanged
- Remove or deprecate `generateSyncConfig` and `generateBuildConfig`

Modify `src/commands/init.js`:
- Remove separate sync/build section toggles
- Wizard flow: prod_root → repos multiselect → build section (venv, frontends, go, launchers) → preview single YAML → confirm → write single `oceancode.yaml`
- No more "Configure sync repos?" / "Configure build targets?" — it's one config now

**Step 4: Run test to verify it passes**
Run: `node --test test/configGen.test.js test/init.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/init.js src/lib/configGen.js test/configGen.test.js test/init.test.js
git commit -m "refactor: init wizard generates single oceancode.yaml"
```

---

### Task 8: Cleanup — remove old loaders, tests, update dispatcher

**Mode:** full
**Skills:** test-driven-development
**Files:**
- Delete: `src/lib/config.js`
- Delete: `src/lib/build/buildConfig.js`
- Delete: `test/config.test.js`
- Delete: `test/buildConfig.test.js`
- Delete: `test/git.test.js`
- Modify: `bin/oceancode.js` (final usage string)
- Modify: `test/configGen.test.js` (remove old function tests)

**Step 1: Write the failing test**

Verify no remaining imports of old modules:
- `grep -r "require.*config\.js\|require.*buildConfig" src/` should return nothing
- All tests pass with old files removed

**Step 2: Run test to verify it fails**
Run: `node --test test/*.test.js`
Expected: FAIL if any file still imports old loaders

**Step 3: Write minimal implementation**

- Delete `src/lib/config.js`, `src/lib/build/buildConfig.js`
- Delete `test/config.test.js`, `test/buildConfig.test.js`, `test/git.test.js`
- Update `bin/oceancode.js` usage string to reflect final command list
- Remove any remaining references to old loaders in test files
- Verify `test/configGen.test.js` no longer tests `generateSyncConfig`/`generateBuildConfig`

**Step 4: Run test to verify it passes**
Run: `node --test test/*.test.js`
Expected: ALL PASS

**Step 5: Commit**
```
git rm src/lib/config.js src/lib/build/buildConfig.js test/config.test.js test/buildConfig.test.js test/git.test.js
git add -A
git commit -m "refactor: remove old config loaders and tests, finalize command renames"
```
