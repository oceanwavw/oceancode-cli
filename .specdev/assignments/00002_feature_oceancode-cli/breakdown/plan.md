# oceancode CLI Implementation Plan

> **For agent:** Implement this plan task-by-task using TDD discipline.

**Goal:** Refactor three standalone Node.js scripts into a single `oceancode` CLI with dispatcher pattern.

**Architecture:** Entry point `bin/oceancode.js` dispatches to command modules in `src/commands/` (sync, git, install). Existing lib internals move to `src/lib/` with no signature changes. Config moves from JSON to YAML at workspace root.

**Tech Stack:** Node.js (CommonJS), js-yaml, fs-extra, micromatch, node:test

**Existing lib interfaces (no changes):**
- `dev2prod(flags)` — flags: `{ dev, prod, mirror, force, dryRun, verbose }`, returns exit code (0 or 2)
- `prod2dev(flags)` — flags: `{ dev, prod, force, dryRun, verbose }`, returns exit code (0 or 2)
- `prune(flags)` — flags: `{ dev, deletelist, dryRun }`, returns exit code (0 or 1)
- `validateDev2Prod(devDir, prodDir)` — throws on invalid direction
- `validateProd2Dev(devDir, prodDir)` — throws on invalid direction

---

### Task 1: Scaffold CLI structure, config loader, and install js-yaml
**Mode:** standard
**Skills:** test-driven-development
**Files:** Create `bin/oceancode.js`, `src/commands/sync.js`, `src/commands/git.js`, `src/commands/install.js`, `src/lib/config.js`; Move `lib/*.js` to `src/lib/`; Modify `package.json`

**Step 1: Write the failing test**
Create `test/config.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-cfg-'));
}

describe('config loader', () => {
  it('loads valid yaml and returns repos', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'sync_repos.yaml');
    fs.writeFileSync(cfgPath, 'repos:\n  myrepo: lib/myrepo\n  other: lib/other\n');

    const { loadConfig, resolveRepos } = require('../src/lib/config');
    const config = loadConfig(cfgPath);
    assert.ok(config.repos);
    assert.equal(config.repos.myrepo, 'lib/myrepo');

    const all = resolveRepos(config, null);
    assert.equal(all.length, 2);
    assert.equal(all[0].name, 'myrepo');
    assert.equal(all[0].path, 'lib/myrepo');

    const filtered = resolveRepos(config, 'myrepo');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'myrepo');

    await fs.remove(tmp);
  });

  it('throws on unknown repo name', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'sync_repos.yaml');
    fs.writeFileSync(cfgPath, 'repos:\n  myrepo: lib/myrepo\n');

    const { loadConfig, resolveRepos } = require('../src/lib/config');
    const config = loadConfig(cfgPath);
    assert.throws(() => resolveRepos(config, 'nonexistent'), /Unknown repos/);

    await fs.remove(tmp);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/config.test.js`
Expected: FAIL (src/lib/config.js does not exist)

**Step 3: Create directory structure, move files, install dependency**
```bash
mkdir -p bin src/commands src/lib
mv lib/shared.js lib/walker.js lib/dev2prod.js lib/prod2dev.js lib/prune.js lib/guards.js src/lib/
rm lib/batch.js
rmdir lib
npm install js-yaml
```

**Step 4: Create src/lib/config.js**
```js
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig(configPath) {
  if (!configPath) {
    configPath = path.join(process.cwd(), 'sync_repos.yaml');
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`sync_repos.yaml not found at ${configPath}`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`Error parsing ${configPath}: ${e.message}`);
  }
  if (!doc || !doc.repos) {
    throw new Error(`sync_repos.yaml missing "repos" key`);
  }
  return doc;
}

function resolveRepos(config, repoArg) {
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

module.exports = { loadConfig, resolveRepos };
```

**Step 5: Create bin/oceancode.js**
```js
#!/usr/bin/env node
'use strict';

const path = require('path');

const GROUPS = {
  sync: path.join(__dirname, '..', 'src', 'commands', 'sync'),
  git: path.join(__dirname, '..', 'src', 'commands', 'git'),
  install: path.join(__dirname, '..', 'src', 'commands', 'install'),
};

const group = process.argv[2];
if (!group || !GROUPS[group]) {
  console.error('Usage: oceancode <sync|git|install> [action] [args] [flags]');
  console.error('');
  console.error('Command groups:');
  console.error('  sync      Sync repos between dev and prod');
  console.error('  git       Git operations across repos');
  console.error('  install   Clone repos from a git server');
  process.exit(1);
}

require(GROUPS[group]).run(process.argv.slice(3));
```

**Step 6: Create stub command files**
Create `src/commands/sync.js`, `src/commands/git.js`, `src/commands/install.js` each with:
```js
'use strict';
async function run(args) {
  console.error('Not implemented yet');
  process.exit(1);
}
module.exports = { run };
```

**Step 7: Update package.json**
```json
{
  "name": "oceancode",
  "version": "1.0.0",
  "description": "OceanWave workspace CLI",
  "bin": { "oceancode": "./bin/oceancode.js" },
  "type": "commonjs",
  "scripts": { "test": "node --test test/" },
  "dependencies": {
    "fs-extra": "^11.3.4",
    "js-yaml": "^4.1.0",
    "micromatch": "^4.0.8"
  }
}
```

**Step 8: Run test to verify it passes**
Run: `node --test test/config.test.js`
Expected: PASS

**Step 9: npm link and verify**
```bash
npm link
oceancode
# Should print usage
```

**Step 10: Commit**
```bash
git add -A && git commit -m "scaffold: oceancode CLI structure with dispatcher and config loader"
```

---

### Task 2: Implement sync command
**Mode:** standard
**Skills:** test-driven-development
**Files:** Modify `src/commands/sync.js`; Create `test/sync.test.js`

**Step 1: Write the failing test**
Create `test/sync.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-sync-'));
}

describe('sync command', () => {
  it('dev2prod syncs matched files via lib', async () => {
    const tmp = await makeTempDir();
    const dev = path.join(tmp, 'dev');
    const prod = path.join(tmp, 'prod');
    await fs.mkdirp(dev);
    await fs.mkdirp(prod);
    await fs.writeFile(path.join(prod, '.prodroot'), '');
    await fs.writeFile(path.join(dev, '.prodinclude'), '**\n');
    await fs.writeFile(path.join(dev, 'hello.txt'), 'hello');

    const { dev2prod } = require('../src/lib/dev2prod');
    const exitCode = await dev2prod({ dev, prod, force: true });
    assert.equal(exitCode, 0);
    assert.ok(await fs.pathExists(path.join(prod, 'hello.txt')));
    await fs.remove(tmp);
  });

  it('resolveRepos filters by comma-delimited names', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'sync_repos.yaml');
    const yaml = require('js-yaml');
    fs.writeFileSync(cfgPath, yaml.dump({ repos: { repoA: 'lib/repoA', repoB: 'lib/repoB' } }));

    const { loadConfig, resolveRepos } = require('../src/lib/config');
    const config = loadConfig(cfgPath);
    const repos = resolveRepos(config, 'repoA');
    assert.equal(repos.length, 1);
    assert.equal(repos[0].name, 'repoA');
    await fs.remove(tmp);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/sync.test.js`
Expected: FAIL (require path `../src/lib/dev2prod` fails because internal requires use `./shared` which now needs to resolve within `src/lib/`)

**Step 3: Fix internal require paths in src/lib files**
The files in `src/lib/` use `require('./shared')`, `require('./walker')`, `require('./guards')` — these are correct since they're all in the same directory. Verify and fix if any path is wrong.

**Step 4: Write sync command**
Rewrite `src/commands/sync.js`:
```js
'use strict';

const path = require('path');
const { loadConfig, resolveRepos } = require('../lib/config');
const { dev2prod } = require('../lib/dev2prod');
const { prod2dev } = require('../lib/prod2dev');
const { prune } = require('../lib/prune');

const ACTIONS = ['dev2prod', 'prod2dev', 'prune'];

function usage() {
  console.error('Usage: oceancode sync <dev2prod|prod2dev|prune> [repos] -s <source> -t <target> [flags]');
  console.error('');
  console.error('Actions:');
  console.error('  dev2prod    Sync from dev to prod');
  console.error('  prod2dev    Sync from prod to dev');
  console.error('  prune       Execute .prod_deletes list');
  console.error('');
  console.error('Flags:');
  console.error('  -s <path>      Source (dev) base path');
  console.error('  -t <path>      Target (prod) base path');
  console.error('  --mirror       Delete files not in dev allowlist (dev2prod only)');
  console.error('  --force        Skip timestamp comparison');
  console.error('  --dry-run      Show what would happen');
  console.error('  --verbose      Show per-file actions');
  console.error('  --config <f>   Config file (default: ./sync_repos.yaml)');
  process.exit(1);
}

function parseArgs(args) {
  const action = args[0];
  if (!action || !ACTIONS.includes(action)) usage();

  const flags = {};
  let repoArg = null;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '-s' && args[i + 1]) { flags.source = path.resolve(args[++i]); continue; }
    if (a === '-t' && args[i + 1]) { flags.target = path.resolve(args[++i]); continue; }
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--mirror') { flags.mirror = true; continue; }
    if (a === '--force') { flags.force = true; continue; }
    if (a === '--dry-run') { flags.dryRun = true; continue; }
    if (a === '--verbose') { flags.verbose = true; continue; }
    if (!repoArg && !a.startsWith('-')) { repoArg = a; continue; }
    usage();
  }

  if (!flags.source) { console.error('Error: missing -s <source>'); process.exit(1); }
  if (!flags.target) { console.error('Error: missing -t <target>'); process.exit(1); }

  return { action, repoArg, flags };
}

async function run(args) {
  const { action, repoArg, flags } = parseArgs(args);
  const config = loadConfig(flags.config);
  const repos = resolveRepos(config, repoArg);

  let passed = 0, failed = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const devDir = path.join(flags.source, repo.path);
    const prodDir = path.join(flags.target, repo.path);
    console.log(`[${i + 1}/${repos.length}] ${repo.name}`);

    try {
      let exitCode;
      switch (action) {
        case 'dev2prod':
          exitCode = await dev2prod({
            dev: devDir, prod: prodDir,
            mirror: flags.mirror, force: flags.force,
            dryRun: flags.dryRun, verbose: flags.verbose,
          });
          break;
        case 'prod2dev':
          exitCode = await prod2dev({
            dev: devDir, prod: prodDir,
            force: flags.force, dryRun: flags.dryRun,
            verbose: flags.verbose,
          });
          break;
        case 'prune': {
          const deletelist = path.join(devDir, '.prod_deletes');
          exitCode = await prune({
            dev: devDir, deletelist,
            dryRun: flags.dryRun,
          });
          break;
        }
      }
      if (exitCode === 0) passed++;
      else failed++;
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run };
```

**Step 5: Run test to verify it passes**
Run: `node --test test/sync.test.js`
Expected: PASS

**Step 6: Commit**
```bash
git add -A && git commit -m "feat: implement sync command wrapping existing lib functions"
```

---

### Task 3: Implement git command with .prodroot guard
**Mode:** standard
**Skills:** test-driven-development
**Files:** Modify `src/commands/git.js`; Create `test/git.test.js`

**Step 1: Write the failing test**
Create `test/git.test.js`:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-git-'));
}

describe('git command .prodroot guard', () => {
  it('requireProdroot throws without .prodroot', async () => {
    const tmp = await makeTempDir();
    const repoDir = path.join(tmp, 'myrepo');
    await fs.mkdirp(repoDir);

    const { requireProdroot } = require('../src/commands/git');
    assert.throws(() => requireProdroot(repoDir), /\.prodroot/);
    await fs.remove(tmp);
  });

  it('requireProdroot passes with .prodroot', async () => {
    const tmp = await makeTempDir();
    const repoDir = path.join(tmp, 'myrepo');
    await fs.mkdirp(repoDir);
    await fs.writeFile(path.join(repoDir, '.prodroot'), '');

    const { requireProdroot } = require('../src/commands/git');
    assert.doesNotThrow(() => requireProdroot(repoDir));
    await fs.remove(tmp);
  });

  it('isReadOnly correctly classifies actions', () => {
    const { isReadOnly } = require('../src/commands/git');
    assert.ok(isReadOnly('status'));
    assert.ok(isReadOnly('fetch'));
    assert.ok(!isReadOnly('commit'));
    assert.ok(!isReadOnly('push'));
    assert.ok(!isReadOnly('pull'));
    assert.ok(!isReadOnly('init'));
    assert.ok(!isReadOnly('remote-add'));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/git.test.js`
Expected: FAIL (git.js is a stub, no requireProdroot/isReadOnly exports)

**Step 3: Write git command implementation**
Rewrite `src/commands/git.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { loadConfig, resolveRepos } = require('../lib/config');

const ACTIONS = ['status', 'commit', 'push', 'pull', 'fetch', 'remote-add', 'init'];
const READ_ONLY = ['status', 'fetch'];

function isReadOnly(action) {
  return READ_ONLY.includes(action);
}

function requireProdroot(dir) {
  if (!fs.existsSync(path.join(dir, '.prodroot'))) {
    throw new Error(`.prodroot not found in ${dir} — destructive git ops require .prodroot marker`);
  }
}

function usage() {
  console.error('Usage: oceancode git <action> [repos] [args] -t <path> [--config <f>]');
  console.error('');
  console.error('Actions:');
  console.error('  status                     Show git status');
  console.error('  commit "message"           Add all and commit');
  console.error('  push <remote>              Push main to remote');
  console.error('  pull <remote>              Pull main from remote');
  console.error('  fetch <remote>             Fetch from remote');
  console.error('  remote-add <name> <url>    Add remote to all repos');
  console.error('  init                       Git init + initial commit');
  console.error('');
  console.error('Flags:');
  console.error('  -t <path>      Base path containing repos');
  console.error('  --config <f>   Config file (default: ./sync_repos.yaml)');
  process.exit(1);
}

function parseArgs(args) {
  const action = args[0];
  if (!action || !ACTIONS.includes(action)) usage();

  const flags = { positional: [] };
  let repoArg = null;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '-t' && args[i + 1]) { flags.target = path.resolve(args[++i]); continue; }
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (!a.startsWith('-')) {
      if (!repoArg && a.includes(',')) { repoArg = a; continue; }
      flags.positional.push(a);
      continue;
    }
    usage();
  }

  if (!flags.target) { console.error('Error: missing -t <path>'); process.exit(1); }

  return { action, repoArg, flags };
}

function git(cwd, cmd) {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function run(args) {
  const { action, repoArg, flags } = parseArgs(args);
  const config = loadConfig(flags.config);

  let actualRepoArg = repoArg;
  if (!actualRepoArg && flags.positional.length > 0 && config.repos[flags.positional[0]]) {
    actualRepoArg = flags.positional.shift();
  }

  const repos = resolveRepos(config, actualRepoArg);
  let passed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const dir = path.join(flags.target, repo.path);

    if (!fs.existsSync(dir)) {
      console.log(`[${i + 1}/${repos.length}] ${repo.name} — directory not found, skipping`);
      skipped++; continue;
    }

    const hasGit = fs.existsSync(path.join(dir, '.git'));

    if (!isReadOnly(action)) {
      try { requireProdroot(dir); } catch (e) {
        console.log(`[${i + 1}/${repos.length}] ${repo.name} — ${e.message}`);
        skipped++; continue;
      }
    }

    if (action !== 'init' && !hasGit) {
      console.log(`[${i + 1}/${repos.length}] ${repo.name} — not a git repo, skipping`);
      skipped++; continue;
    }

    console.log(`[${i + 1}/${repos.length}] ${repo.name}`);

    try {
      switch (action) {
        case 'init': {
          if (hasGit) { console.log('  already initialized, skipping'); skipped++; break; }
          git(dir, 'init -b main');
          git(dir, 'add -A');
          git(dir, 'commit -m "initial commit"');
          console.log('  initialized + initial commit');
          passed++; break;
        }
        case 'status': {
          try { git(dir, 'checkout main'); } catch {}
          const out = git(dir, 'status --short');
          console.log(out || '  clean');
          passed++; break;
        }
        case 'commit': {
          const msg = flags.positional[0];
          if (!msg) { console.error('  ERROR: commit requires a message'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          git(dir, 'add -A');
          try {
            git(dir, `commit -m "${msg.replace(/"/g, '\\"')}"`);
            console.log('  committed');
            passed++;
          } catch (e) {
            if (e.stderr && e.stderr.includes('nothing to commit')) {
              console.log('  nothing to commit'); passed++;
            } else { throw e; }
          }
          break;
        }
        case 'push': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: push requires a remote name'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`); skipped++; break;
          }
          git(dir, `push ${remote} main`);
          console.log(`  pushed to ${remote}/main`);
          passed++; break;
        }
        case 'pull': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: pull requires a remote name'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`); skipped++; break;
          }
          git(dir, `pull ${remote} main`);
          console.log(`  pulled from ${remote}/main`);
          passed++; break;
        }
        case 'fetch': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: fetch requires a remote name'); failed++; break; }
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`); skipped++; break;
          }
          git(dir, `fetch ${remote}`);
          console.log(`  fetched from ${remote}`);
          passed++; break;
        }
        case 'remote-add': {
          const remoteName = flags.positional[0];
          const baseUrl = flags.positional[1];
          if (!remoteName || !baseUrl) {
            console.error('  ERROR: remote-add requires <name> <base-url>'); failed++; break;
          }
          const url = `${baseUrl.replace(/\/$/, '')}/${repo.name}.git`;
          try {
            git(dir, `remote get-url ${remoteName}`);
            console.log(`  remote '${remoteName}' already exists, skipping`); skipped++;
          } catch {
            git(dir, `remote add ${remoteName} ${url}`);
            console.log(`  added ${remoteName} -> ${url}`); passed++;
          }
          break;
        }
      }
    } catch (e) {
      const msg = e.stderr ? e.stderr.trim() : e.message;
      console.error(`  ERROR: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run, isReadOnly, requireProdroot };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/git.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: implement git command with .prodroot guard"
```

---

### Task 4: Implement install command
**Mode:** lightweight
**Skills:** none
**Files:** Modify `src/commands/install.js`

**Step 1: Write install command**
Rewrite `src/commands/install.js`:
```js
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { loadConfig, resolveRepos } = require('../lib/config');

function usage() {
  console.error('Usage: oceancode install <base-url> [--config <f>]');
  console.error('');
  console.error('Clones all repos from a git server.');
  process.exit(1);
}

function parseArgs(args) {
  let baseUrl = null;
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (!baseUrl && !a.startsWith('-')) { baseUrl = a; continue; }
    usage();
  }
  if (!baseUrl) usage();
  return { baseUrl: baseUrl.replace(/\/$/, ''), flags };
}

async function run(args) {
  const { baseUrl, flags } = parseArgs(args);
  const config = loadConfig(flags.config);
  const repos = resolveRepos(config, null);
  const rootDir = process.cwd();

  const dirs = new Set();
  for (const repo of repos) {
    dirs.add(path.dirname(path.join(rootDir, repo.path)));
  }
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  let cloned = 0, skipped = 0, failed = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const dir = path.join(rootDir, repo.path);
    console.log(`[${i + 1}/${repos.length}] ${repo.name} -> ${repo.path}`);

    if (fs.existsSync(dir)) {
      const hasGit = fs.existsSync(path.join(dir, '.git'));
      console.log(`  skipped (already exists${hasGit ? '' : ', no .git'})`);
      skipped++; continue;
    }

    try {
      const url = `${baseUrl}/${repo.name}.git`;
      execSync(`git clone "${url}" "${dir}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
      console.log('  cloned');
      cloned++;
    } catch (e) {
      const msg = e.stderr ? e.stderr.toString().trim() : e.message;
      console.error(`  ERROR: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${cloned} cloned, ${skipped} skipped, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run };
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: implement install command"
```

---

### Task 5: Create sync_repos.yaml, clean up old files, verify end-to-end
**Mode:** full
**Skills:** test-driven-development
**Files:** Create `sync_repos.yaml` at workspace root; Delete `sync_repo.js`, `git_all.js`, `install.js`, `sync_repos.json`, `synclist.txt`; Delete old test files

**Step 1: Create sync_repos.yaml at workspace root**
Create `/mnt/h/oceanwave/sync_repos.yaml`:
```yaml
repos:
  oceanseed_app: lib/back_ends/oceanseed_app
  oceanfarm_app: lib/back_ends/oceanfarm_app
  oceanhub_app: lib/back_ends/oceanhub_app
  oceandata_app: lib/back_ends/oceandata_app
  oceanlive_app: lib/back_ends/oceanlive_app
  oceanwave_dash: lib/front_ends/oceanwave_dash
  oceanreact: lib/front_ends/oceanreact
  oceandata_gui: lib/front_ends/oceandata_gui
  oceanpyqt: lib/front_ends/oceanpyqt
  oceanapp: lib/front_ends/oceanapp
  oceandata_tau: lib/front_ends/oceandata_tau
  jsonldb: lib/jsonldb
  oceancap: lib/oceancap
  oceandata: lib/oceandata
  oceanfarm: lib/oceanfarm
  oceanquant: lib/oceanquant
  oceanseed: lib/oceanseed
  oceanutil: lib/oceanutil
  oceanshed: lib/oceanshed
  dataportal: lib/dataportal
  oceandata-cli: lib/cli/oceandata-cli
  oceanlab-cli: lib/cli/oceanlab-cli
  data_configs: hubs/data_configs
  signal_samples: hubs/signal_samples
  scripts: scripts
```

**Step 2: Delete old files**
```bash
rm sync_repo.js git_all.js install.js sync_repos.json synclist.txt
rm test/dev2prod.test.js test/guards.test.js test/integration.test.js test/prod2dev.test.js test/prune.test.js test/shared.test.js test/walker.test.js
```

**Step 3: Run full test suite**
Run: `node --test test/`
Expected: PASS (config.test.js, sync.test.js, git.test.js)

**Step 4: Verify CLI end-to-end**
```bash
oceancode
# Should print usage with sync|git|install

oceancode sync
# Should print sync usage with dev2prod|prod2dev|prune

oceancode git
# Should print git usage with action list
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: oceancode CLI complete — remove legacy scripts, add sync_repos.yaml"
```
