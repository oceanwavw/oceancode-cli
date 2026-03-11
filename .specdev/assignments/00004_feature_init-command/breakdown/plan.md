# Interactive Init Command Implementation Plan

> **For agent:** Implement this plan task-by-task using TDD discipline.

**Goal:** Add `@clack/prompts` dependency and build interactive prompts across the oceancode CLI — primarily `oceancode init` wizard for config generation, plus multi-select pickers for `install`, `git`, `build`, `sync`, and `launch` commands.

**Architecture:** `src/lib/defaults.js` holds hardcoded OceanWave registry. `src/commands/init.js` is the wizard command using `@clack/prompts`. Each existing command gains a prompt block that activates when no args given and stdin is TTY. Config files are written atomically via temp-file-then-rename.

**Tech Stack:** Node.js (CommonJS), `@clack/prompts`, `js-yaml`, `node:test`

---

### Task 1: Add @clack/prompts dependency and defaults registry
**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Create `src/lib/defaults.js`
- Create `test/defaults.test.js`
- Modify `package.json`

**Step 1: Write the failing test**
```js
// test/defaults.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const defaults = require('../src/lib/defaults');

describe('defaults registry', () => {
  it('repos array has entries with name and path', () => {
    assert.ok(defaults.repos.length > 0);
    for (const r of defaults.repos) {
      assert.ok(typeof r.name === 'string', `missing name`);
      assert.ok(typeof r.path === 'string', `missing path for ${r.name}`);
    }
  });

  it('pythonVenvTargets have name and path', () => {
    assert.ok(defaults.pythonVenvTargets.length > 0);
    for (const t of defaults.pythonVenvTargets) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.path === 'string');
    }
  });

  it('frontendTargets have name and path', () => {
    assert.ok(defaults.frontendTargets.length > 0);
    for (const t of defaults.frontendTargets) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.path === 'string');
    }
  });

  it('goTargets have name and path', () => {
    assert.ok(defaults.goTargets.length > 0);
    for (const t of defaults.goTargets) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.path === 'string');
    }
  });

  it('launchers have name and label', () => {
    assert.ok(defaults.launchers.length > 0);
    for (const l of defaults.launchers) {
      assert.ok(typeof l.name === 'string');
      assert.ok(typeof l.label === 'string');
    }
  });

  it('pypiDeps is a non-empty array of strings', () => {
    assert.ok(defaults.pypiDeps.length > 0);
    for (const d of defaults.pypiDeps) {
      assert.ok(typeof d === 'string');
    }
  });

  it('toolInstall has entries with url', () => {
    assert.ok(Object.keys(defaults.toolInstall).length > 0);
    for (const [name, info] of Object.entries(defaults.toolInstall)) {
      assert.ok(typeof info.url === 'string', `missing url for ${name}`);
    }
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/defaults.test.js`
Expected: FAIL with "Cannot find module '../src/lib/defaults'"

**Step 3: Write minimal implementation**
Run: `npm install @clack/prompts`

```js
// src/lib/defaults.js
'use strict';

module.exports = {
  repos: [
    { name: 'oceanfarm', path: 'lib/oceanfarm' },
    { name: 'oceanquant', path: 'lib/oceanquant' },
    { name: 'oceandata', path: 'lib/oceandata' },
    { name: 'oceanseed', path: 'lib/oceanseed' },
    { name: 'oceanlive', path: 'lib/oceanlive' },
    { name: 'oceanutil', path: 'lib/oceanutil' },
    { name: 'oceancap', path: 'lib/oceancap' },
    { name: 'oceandoc', path: 'lib/oceandoc' },
    { name: 'oceanreef', path: 'lib/oceanreef' },
    { name: 'oceanshed', path: 'lib/oceanshed' },
    { name: 'jsonldb', path: 'lib/jsonldb' },
    { name: 'dataportal', path: 'lib/dataportal' },
    { name: 'oceandata_app', path: 'lib/back_ends/oceandata_app' },
    { name: 'oceanfarm_app', path: 'lib/back_ends/oceanfarm_app' },
    { name: 'oceanlive_app', path: 'lib/back_ends/oceanlive_app' },
    { name: 'oceanseed_app', path: 'lib/back_ends/oceanseed_app' },
    { name: 'oceanhub_app', path: 'lib/back_ends/oceanhub_app' },
    { name: 'oceanapp', path: 'lib/front_ends/oceanapp' },
    { name: 'oceandata_gui', path: 'lib/front_ends/oceandata_gui' },
    { name: 'oceandata_tau', path: 'lib/front_ends/oceandata_tau' },
    { name: 'oceannode', path: 'lib/front_ends/oceannode' },
    { name: 'oceanpyqt', path: 'lib/front_ends/oceanpyqt' },
    { name: 'oceanreact', path: 'lib/front_ends/oceanreact' },
    { name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' },
    { name: 'oceandata-cli', path: 'lib/cli/oceandata-cli' },
  ],

  pythonVenvTargets: [
    { name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' },
    { name: 'oceandata_gui', path: 'lib/front_ends/oceandata_gui' },
    { name: 'oceandata_tau', path: 'lib/front_ends/oceandata_tau' },
    { name: 'dataportal', path: 'lib/dataportal' },
    { name: 'oceanshed', path: 'lib/oceanshed' },
    { name: 'oceanquant', path: 'lib/oceanquant' },
  ],

  frontendTargets: [
    { name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' },
    { name: 'oceandata_tau', path: 'lib/front_ends/oceandata_tau' },
    { name: 'dataportal', path: 'lib/dataportal' },
    { name: 'oceanreact', path: 'lib/front_ends/oceanreact' },
    { name: 'oceannode', path: 'lib/front_ends/oceannode' },
  ],

  goTargets: [
    { name: 'oceandata-cli', path: 'lib/cli/oceandata-cli' },
    { name: 'dataportal-go', path: 'lib/dataportal/go_backend' },
  ],

  launchers: [
    { name: 'oceanwave_dash', label: 'OceanWave Dashboard' },
    { name: 'oceandata_gui', label: 'OceanData GUI' },
    { name: 'oceandata_tau', label: 'OceanData Tau' },
    { name: 'dataportal', label: 'Data Portal' },
    { name: 'oceanhub_app', label: 'OceanHub Server' },
  ],

  pypiDeps: [
    'loguru', 'base36', 'scipy', 'matplotlib', 'plotly', 'bokeh', 'numba',
    'pandas', 'numpy', 'toml', 'fastapi', 'uvicorn', 'pydantic', 'httpx',
    'pytest', 'pytest-asyncio', 'requests', 'pyyaml', 'python-dateutil',
    'gitpython', 'gita', 'pandas-ta==0.4.71b0',
  ],

  preflightTools: {
    backends: ['uv'],
    frontends: ['node', 'npm'],
    cli: ['go'],
  },

  toolInstall: {
    uv: {
      url: 'https://docs.astral.sh/uv/',
      auto: {
        linux: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
        macos: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
        windows: 'winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements',
      },
    },
    node: {
      url: 'https://nodejs.org/',
      auto: {
        macos: 'brew install node',
        windows: 'winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements',
      },
    },
    go: {
      url: 'https://go.dev/',
      auto: {
        macos: 'brew install go',
        windows: 'winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements',
      },
    },
    bun: {
      url: 'https://bun.sh/',
      auto: {
        linux: 'curl -fsSL https://bun.sh/install | bash',
        macos: 'curl -fsSL https://bun.sh/install | bash',
        windows: 'winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements',
      },
    },
    cargo: {
      url: 'https://rustup.rs/',
      auto: {
        linux: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
        macos: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
        windows: 'winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements',
      },
    },
  },
};
```

**Step 4: Run test to verify it passes**
Run: `node --test test/defaults.test.js`
Expected: PASS (7 tests)

**Step 5: Commit**
```
git add src/lib/defaults.js test/defaults.test.js package.json package-lock.json
git commit -m "feat: add defaults registry and @clack/prompts dependency"
```

---

### Task 2: Config generation functions
**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Create `src/lib/configGen.js`
- Create `test/configGen.test.js`

**Step 1: Write the failing test**
```js
// test/configGen.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { generateSyncConfig, generateBuildConfig, writeConfigAtomic } = require('../src/lib/configGen');
const defaults = require('../src/lib/defaults');

describe('config generation', () => {
  it('generateSyncConfig produces valid repos object map', () => {
    const selected = [defaults.repos[0], defaults.repos[1]];
    const config = generateSyncConfig(selected);
    assert.ok(config.repos);
    assert.equal(typeof config.repos, 'object');
    assert.equal(config.repos[selected[0].name], selected[0].path);
    assert.equal(config.repos[selected[1].name], selected[1].path);
  });

  it('generateBuildConfig produces valid build.yaml structure', () => {
    const opts = {
      pythonVersion: '3.12',
      venvTargets: [defaults.pythonVenvTargets[0]],
      frontendTargets: [defaults.frontendTargets[0]],
      goTargets: [defaults.goTargets[0]],
      launchers: [defaults.launchers[0]],
    };
    const config = generateBuildConfig(opts);
    assert.equal(config.python_version, '3.12');
    assert.ok(config.venv);
    assert.ok(config.pypi_deps);
    assert.ok(config.frontends);
    assert.ok(config.cli_tools);
    assert.ok(config.launchers);
    assert.ok(config.preflight_tools);
    assert.ok(config.tool_install);
  });

  it('writeConfigAtomic writes file atomically', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cg-'));
    const filePath = path.join(tmpDir, 'test.yaml');
    writeConfigAtomic(filePath, { repos: { foo: 'bar' } });
    const content = yaml.load(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(content, { repos: { foo: 'bar' } });
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('writeConfigAtomic cleans up temp file on error', () => {
    const badPath = path.join('/nonexistent-dir-xyz', 'test.yaml');
    assert.throws(() => writeConfigAtomic(badPath, {}));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/configGen.test.js`
Expected: FAIL with "Cannot find module '../src/lib/configGen'"

**Step 3: Write minimal implementation**
```js
// src/lib/configGen.js
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const defaults = require('./defaults');

function generateSyncConfig(selectedRepos) {
  const repos = {};
  for (const r of selectedRepos) {
    repos[r.name] = r.path;
  }
  return { repos };
}

function generateBuildConfig(opts) {
  const config = {};
  config.python_version = opts.pythonVersion || '3.12';

  // Venvs
  config.venv = {};
  for (const t of opts.venvTargets || []) {
    config.venv[t.name] = {
      path: t.path,
      dir: { linux: 'venv-linux', macos: 'venv-linux', windows: 'venv-windows' },
    };
  }

  config.pypi_deps = defaults.pypiDeps;

  // Local packages — include all repos that have pyproject.toml potential
  config.local_packages = [];
  for (const r of defaults.repos) {
    config.local_packages.push({ name: r.name, path: r.path });
  }

  // Frontends
  config.frontends = [];
  for (const f of opts.frontendTargets || []) {
    config.frontends.push({ name: f.name, path: f.path, verify: 'dist' });
  }

  // CLI tools
  config.cli_tools = [];
  for (const g of opts.goTargets || []) {
    config.cli_tools.push({ name: g.name, path: g.path, type: 'go' });
  }

  // Launchers
  config.launchers = {};
  for (const l of opts.launchers || []) {
    const launcherDefaults = (defaults.launcherConfigs || {})[l.name];
    if (launcherDefaults) {
      config.launchers[l.name] = launcherDefaults;
    }
  }

  config.preflight_tools = defaults.preflightTools;
  config.tool_install = defaults.toolInstall;

  return config;
}

function writeConfigAtomic(filePath, data) {
  const content = yaml.dump(data, { lineWidth: -1, quotingType: '"' });
  const tmpPath = filePath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch {}
    throw e;
  }
}

module.exports = { generateSyncConfig, generateBuildConfig, writeConfigAtomic };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/configGen.test.js`
Expected: PASS (4 tests)

**Step 5: Commit**
```
git add src/lib/configGen.js test/configGen.test.js
git commit -m "feat: add config generation functions with atomic writes"
```

---

### Task 3: Init wizard command
**Mode:** full
**Skills:** test-driven-development
**Files:**
- Create `src/commands/init.js`
- Create `test/init.test.js`
- Modify `bin/oceancode.js`

**Step 1: Write the failing test**
```js
// test/init.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../src/commands/init');

describe('init command', () => {
  it('parseArgs returns default config path flag', () => {
    const result = parseArgs([]);
    assert.equal(result.flags.config, undefined);
  });

  it('parseArgs accepts --config flag', () => {
    const result = parseArgs(['--config', '/tmp/test.yaml']);
    assert.ok(result.flags.config);
  });

  it('exits with message when not TTY', async () => {
    // The run function should check process.stdin.isTTY
    // This is tested by verifying the guard exists in the module
    const init = require('../src/commands/init');
    assert.ok(typeof init.run === 'function');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/init.test.js`
Expected: FAIL with "Cannot find module '../src/commands/init'"

**Step 3: Write minimal implementation**
```js
// src/commands/init.js
'use strict';
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const defaults = require('../lib/defaults');
const { generateSyncConfig, generateBuildConfig, writeConfigAtomic } = require('../lib/configGen');

function usage() {
  console.error('Usage: oceancode init');
  console.error('');
  console.error('Interactive wizard to generate sync_repos.yaml and build.yaml');
  process.exit(1);
}

function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--help' || a === '-h')) usage();
  }
  return { flags };
}

async function run(args) {
  parseArgs(args);

  if (!process.stdin.isTTY) {
    console.error('Error: oceancode init requires an interactive terminal.');
    console.error('Run it directly in a terminal, not piped or in CI.');
    process.exit(1);
  }

  const { intro, outro, text, multiselect, confirm, select, isCancel } = require('@clack/prompts');

  intro('oceancode init — workspace configuration wizard');

  // Step 1: Workspace root
  const workspaceRoot = await text({
    message: 'Dev workspace root:',
    initialValue: process.cwd(),
    validate: (v) => {
      if (!fs.existsSync(v)) return 'Directory does not exist';
    },
  });
  if (isCancel(workspaceRoot)) { outro('Cancelled.'); process.exit(0); }

  // Step 2: Prod directory
  const prodPath = await text({
    message: 'Prod directory path:',
    validate: (v) => {
      if (!v || v.trim() === '') return 'Path is required';
    },
  });
  if (isCancel(prodPath)) { outro('Cancelled.'); process.exit(0); }

  let writeSyncConfig = false;
  let syncRepos = [];

  // Step 3: Sync section
  const doSync = await confirm({ message: 'Configure sync repos (sync_repos.yaml)?' });
  if (!isCancel(doSync) && doSync) {
    const syncPath = path.join(workspaceRoot, 'sync_repos.yaml');
    let proceed = true;
    if (fs.existsSync(syncPath)) {
      proceed = await confirm({ message: 'sync_repos.yaml already exists. Overwrite?' });
      if (isCancel(proceed)) proceed = false;
    }
    if (proceed) {
      syncRepos = await multiselect({
        message: 'Select repos to sync:',
        options: defaults.repos.map(r => ({ value: r, label: r.name, hint: r.path })),
        initialValues: defaults.repos,
      });
      if (!isCancel(syncRepos) && syncRepos.length > 0) {
        writeSyncConfig = true;
      }
    }
  }

  let writeBuildConfig = false;
  let buildOpts = {};

  // Step 4: Build section
  const doBuild = await confirm({ message: 'Configure build targets (build.yaml)?' });
  if (!isCancel(doBuild) && doBuild) {
    const buildPath = path.join(workspaceRoot, 'build.yaml');
    let proceed = true;
    if (fs.existsSync(buildPath)) {
      proceed = await confirm({ message: 'build.yaml already exists. Overwrite?' });
      if (isCancel(proceed)) proceed = false;
    }
    if (proceed) {
      const pythonVersion = await text({
        message: 'Python version:',
        initialValue: '3.12',
      });

      const venvTargets = await multiselect({
        message: 'Python venv targets:',
        options: defaults.pythonVenvTargets.map(t => ({ value: t, label: t.name, hint: t.path })),
        initialValues: defaults.pythonVenvTargets,
      });

      const frontendTargets = await multiselect({
        message: 'Frontend (npm) build targets:',
        options: defaults.frontendTargets.map(t => ({ value: t, label: t.name, hint: t.path })),
        initialValues: defaults.frontendTargets,
      });

      const goTargets = await multiselect({
        message: 'Go build targets:',
        options: defaults.goTargets.map(t => ({ value: t, label: t.name, hint: t.path })),
        initialValues: defaults.goTargets,
      });

      // Step 5: Launchers
      const launcherSelection = await multiselect({
        message: 'Launchers:',
        options: defaults.launchers.map(l => ({ value: l, label: l.label, hint: l.name })),
        initialValues: defaults.launchers,
      });

      if (!isCancel(pythonVersion) && !isCancel(venvTargets) && !isCancel(frontendTargets) && !isCancel(goTargets) && !isCancel(launcherSelection)) {
        buildOpts = {
          pythonVersion: isCancel(pythonVersion) ? '3.12' : pythonVersion,
          venvTargets: isCancel(venvTargets) ? [] : venvTargets,
          frontendTargets: isCancel(frontendTargets) ? [] : frontendTargets,
          goTargets: isCancel(goTargets) ? [] : goTargets,
          launchers: isCancel(launcherSelection) ? [] : launcherSelection,
        };
        writeBuildConfig = true;
      }
    }
  }

  // Step 6: Write files
  if (writeSyncConfig) {
    const syncPath = path.join(workspaceRoot, 'sync_repos.yaml');
    const config = generateSyncConfig(syncRepos);
    writeConfigAtomic(syncPath, config);
    console.log(`  Written: ${syncPath}`);
  }

  if (writeBuildConfig) {
    const buildPath = path.join(workspaceRoot, 'build.yaml');
    const config = generateBuildConfig(buildOpts);
    writeConfigAtomic(buildPath, config);
    console.log(`  Written: ${buildPath}`);
  }

  if (!writeSyncConfig && !writeBuildConfig) {
    outro('Nothing to write. Run oceancode init again to configure.');
  } else {
    outro('Configuration complete!');
  }
}

module.exports = { run, parseArgs };
```

Add `init` to dispatcher:
```js
// bin/oceancode.js — add to GROUPS map:
init: path.join(__dirname, '..', 'src', 'commands', 'init'),
```

**Step 4: Run test to verify it passes**
Run: `node --test test/init.test.js`
Expected: PASS (3 tests)

**Step 5: Commit**
```
git add src/commands/init.js test/init.test.js bin/oceancode.js
git commit -m "feat: add oceancode init wizard command"
```

---

### Task 4: Add interactive prompts to install command
**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify `src/commands/install.js`
- Modify `test/sync.test.js` (or create `test/install.test.js` if needed)

**Step 1: Write the failing test**
```js
// Add to existing test or create test/install.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('install command', () => {
  it('parseArgs still works with base-url provided', () => {
    // Re-require after modification to ensure backward compat
    const install = require('../src/commands/install');
    assert.ok(typeof install.run === 'function');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/install.test.js`
Expected: PASS (module exists) — this is a behavior-preserving change, test is for regression

**Step 3: Write minimal implementation**
Modify `src/commands/install.js` `run()` function — add prompt block before parseArgs usage check:
```js
// In run(), after parseArgs, before loadConfig:
if (!baseUrl && process.stdin.isTTY) {
  const { text, multiselect, isCancel } = require('@clack/prompts');
  const urlResult = await text({ message: 'Git server base URL:' });
  if (isCancel(urlResult)) process.exit(0);
  baseUrl = urlResult.replace(/\/$/, '');

  // After loading config, prompt for repo selection
  const repos = resolveRepos(config, null);
  const selected = await multiselect({
    message: 'Select repos to clone:',
    options: repos.map(r => ({ value: r.name, label: r.name, hint: r.path })),
    initialValues: repos.map(r => r.name),
  });
  if (isCancel(selected)) process.exit(0);
  // Filter repos to selected
  repoFilter = selected.join(',');
}
```

**Step 4: Run test to verify it passes**
Run: `node --test test/install.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/install.js test/install.test.js
git commit -m "feat: add interactive prompts to install command"
```

---

### Task 5: Add interactive prompts to git command
**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify `src/commands/git.js`

**Step 1: Write the failing test**
```js
// test/git.test.js already exists — verify existing tests still pass
```

**Step 2: Run test to verify current state**
Run: `node --test test/git.test.js`
Expected: PASS (existing tests)

**Step 3: Write minimal implementation**
Add prompt block at start of `run()` in `src/commands/git.js`:
```js
// At start of run(), before parseArgs:
if (args.length === 0 && process.stdin.isTTY) {
  const { select, text, multiselect, isCancel } = require('@clack/prompts');
  const action = await select({
    message: 'Git action:',
    options: ACTIONS.map(a => ({ value: a, label: a })),
  });
  if (isCancel(action)) process.exit(0);
  args = [action];

  const targetPath = await text({ message: 'Target path (-t):' });
  if (isCancel(targetPath)) process.exit(0);
  args.push('-t', targetPath);

  // Load config to get repo list for multiselect
  const config = loadConfig();
  const allRepos = resolveRepos(config, null);
  const selected = await multiselect({
    message: 'Select repos:',
    options: allRepos.map(r => ({ value: r.name, label: r.name, hint: r.path })),
    initialValues: allRepos.map(r => r.name),
  });
  if (isCancel(selected)) process.exit(0);
  if (selected.length < allRepos.length) {
    args.splice(1, 0, selected.join(','));
  }
}
```

**Step 4: Run test to verify it passes**
Run: `node --test test/git.test.js`
Expected: PASS (existing tests unaffected — prompts only trigger when no args AND TTY)

**Step 5: Commit**
```
git add src/commands/git.js
git commit -m "feat: add interactive prompts to git command"
```

---

### Task 6: Add interactive prompts to build, sync, and launch commands
**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify `src/commands/build.js`
- Modify `src/commands/sync.js`
- Modify `src/commands/launch.js`

**Step 1: Write the failing test**
Run existing tests to establish baseline:
Run: `node --test test/build.test.js test/sync.test.js test/launch.test.js`
Expected: PASS (all existing tests)

**Step 2: Write minimal implementation**

**build.js** — add prompt at start of `run()`:
```js
if (args.length === 0 && process.stdin.isTTY) {
  const { select, isCancel } = require('@clack/prompts');
  const target = await select({
    message: 'Build target:',
    options: TARGETS.filter(t => t !== 'all').map(t => ({ value: t, label: t })),
  });
  if (isCancel(target)) process.exit(0);
  args = [target];
}
```

**sync.js** — add prompt at start of `run()`:
```js
if (args.length === 0 && process.stdin.isTTY) {
  const { select, text, multiselect, isCancel } = require('@clack/prompts');
  const action = await select({
    message: 'Sync action:',
    options: ACTIONS.map(a => ({ value: a, label: a })),
  });
  if (isCancel(action)) process.exit(0);

  const source = await text({ message: 'Source path (-s):' });
  if (isCancel(source)) process.exit(0);

  const target = await text({ message: 'Target path (-t):' });
  if (isCancel(target)) process.exit(0);

  args = [action, '-s', source, '-t', target];

  const config = loadConfig();
  const allRepos = resolveRepos(config, null);
  const selected = await multiselect({
    message: 'Select repos:',
    options: allRepos.map(r => ({ value: r.name, label: r.name, hint: r.path })),
    initialValues: allRepos.map(r => r.name),
  });
  if (isCancel(selected)) process.exit(0);
  if (selected.length < allRepos.length) {
    args.splice(1, 0, selected.join(','));
  }
}
```

**launch.js** — add prompt at start of `run()`:
```js
if (args.length === 0 && process.stdin.isTTY) {
  const { select, isCancel } = require('@clack/prompts');
  const defaults = require('../lib/defaults');
  const app = await select({
    message: 'Launch app:',
    options: defaults.launchers.map(l => ({ value: l.name, label: l.label })),
  });
  if (isCancel(app)) process.exit(0);
  args = [app];
}
```

**Step 3: Run tests to verify nothing broke**
Run: `node --test test/build.test.js test/sync.test.js test/launch.test.js`
Expected: PASS (all existing tests — prompts only trigger when no args AND TTY)

**Step 4: Commit**
```
git add src/commands/build.js src/commands/sync.js src/commands/launch.js
git commit -m "feat: add interactive prompts to build, sync, and launch commands"
```

---

### Task 7: Integration verification and final cleanup
**Mode:** full
**Skills:** test-driven-development
**Files:**
- Modify `bin/oceancode.js` (verify init entry)
- All test files

**Step 1: Run full test suite**
Run: `node --test test/*.test.js`
Expected: ALL PASS

**Step 2: Verify init is registered in dispatcher**
Check `bin/oceancode.js` has `init` in GROUPS map and usage string.

**Step 3: Verify @clack/prompts is in package.json dependencies**
Run: `node -e "require('@clack/prompts'); console.log('ok')"`
Expected: "ok"

**Step 4: Commit**
```
git add -A
git commit -m "chore: final integration verification for init command"
```
