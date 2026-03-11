# Build Scripts Integration — Implementation Plan

> **For agent:** Implement this plan task-by-task using TDD discipline.

**Goal:** Rewrite 8 platform-specific shell/batch build and launcher scripts as cross-platform Node.js command modules (`build` and `launch`) in the `oceancode` CLI, driven by a `build.yaml` config.

**Architecture:** `src/commands/build.js` dispatches to builder modules in `src/lib/build/` (platform, preflight, backends, frontends, cli). `src/commands/launch.js` handles app launching. `build.yaml` at workspace root defines all build config. `platform.js` provides OS detection helpers.

**Tech Stack:** Node.js (CommonJS), js-yaml, fs-extra, node:test

**Existing interfaces (no changes):**
- `src/lib/config.js` — `loadConfig(path)`, `resolveRepos(config, repoArg)` (for sync_repos.yaml)
- `bin/oceancode.js` — dispatcher, needs new entries for `build` and `launch`

---

### Task 1: Platform helpers and build config loader
**Mode:** standard
**Skills:** test-driven-development
**Files:** Create `src/lib/build/platform.js`, `src/lib/build/buildConfig.js`; Create `test/platform.test.js`, `test/buildConfig.test.js`

**Step 1: Write the failing tests**
Create `test/platform.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('platform helpers', () => {
  it('getPlatform returns linux, macos, or windows', () => {
    const { getPlatform } = require('../src/lib/build/platform');
    const p = getPlatform();
    assert.ok(['linux', 'macos', 'windows'].includes(p));
  });

  it('getVenvBin returns correct path for platform', () => {
    const { getVenvBin, getPlatform } = require('../src/lib/build/platform');
    const bin = getVenvBin('/tmp/venv');
    const p = getPlatform();
    if (p === 'windows') {
      assert.ok(bin.endsWith('Scripts\\python.exe'));
    } else {
      assert.ok(bin.endsWith('bin/python'));
    }
  });

  it('getBinDir returns platform-specific dir', () => {
    const { getBinDir, getPlatform } = require('../src/lib/build/platform');
    const dir = getBinDir();
    const p = getPlatform();
    const expected = { linux: 'bin/linux', macos: 'bin/macos', windows: 'bin/win' };
    assert.equal(dir, expected[p]);
  });

  it('getBinExt returns .exe on windows, empty otherwise', () => {
    const { getBinExt, getPlatform } = require('../src/lib/build/platform');
    const ext = getBinExt();
    const p = getPlatform();
    assert.equal(ext, p === 'windows' ? '.exe' : '');
  });

  it('getScriptExt returns .bat on windows, .sh otherwise', () => {
    const { getScriptExt, getPlatform } = require('../src/lib/build/platform');
    const ext = getScriptExt();
    const p = getPlatform();
    assert.equal(ext, p === 'windows' ? '.bat' : '.sh');
  });

  it('getPlatformKey maps platform to config keys', () => {
    const { getPlatformKey, getPlatform } = require('../src/lib/build/platform');
    const key = getPlatformKey();
    const p = getPlatform();
    // getPlatformKey returns the same as getPlatform for config lookups
    assert.equal(key, p);
  });
});
```

Create `test/buildConfig.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-bcfg-'));
}

describe('build config loader', () => {
  it('loads valid build.yaml and returns config', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'build.yaml');
    fs.writeFileSync(cfgPath, [
      'python_version: "3.12"',
      'pypi_deps:',
      '  - numpy',
      'local_packages:',
      '  - name: mypkg',
      '    path: lib/mypkg',
      'frontends:',
      '  - name: myfe',
      '    path: lib/myfe',
      '    verify: dist',
      'cli_tools:',
      '  - name: mycli',
      '    path: lib/mycli',
      '    type: go',
      'preflight_tools:',
      '  backends: [uv]',
      '  frontends: [node]',
      '  cli: [go]',
    ].join('\n'));

    const { loadBuildConfig } = require('../src/lib/build/buildConfig');
    const config = loadBuildConfig(cfgPath);
    assert.equal(config.python_version, '3.12');
    assert.ok(Array.isArray(config.pypi_deps));
    assert.equal(config.pypi_deps[0], 'numpy');
    assert.equal(config.local_packages[0].name, 'mypkg');
    assert.equal(config.frontends[0].name, 'myfe');
    assert.equal(config.cli_tools[0].name, 'mycli');
    await fs.remove(tmp);
  });

  it('throws on missing file', () => {
    const { loadBuildConfig } = require('../src/lib/build/buildConfig');
    assert.throws(() => loadBuildConfig('/nonexistent/build.yaml'), /not found/);
  });

  it('resolveTarget returns matching items from config array', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'build.yaml');
    fs.writeFileSync(cfgPath, [
      'python_version: "3.12"',
      'local_packages:',
      '  - name: pkgA',
      '    path: lib/pkgA',
      '  - name: pkgB',
      '    path: lib/pkgB',
      'frontends: []',
      'cli_tools: []',
      'preflight_tools:',
      '  backends: [uv]',
    ].join('\n'));

    const { loadBuildConfig, resolveTarget } = require('../src/lib/build/buildConfig');
    const config = loadBuildConfig(cfgPath);
    const all = resolveTarget(config.local_packages, null);
    assert.equal(all.length, 2);
    const filtered = resolveTarget(config.local_packages, 'pkgA');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'pkgA');
    assert.throws(() => resolveTarget(config.local_packages, 'nonexistent'), /Unknown target/);
    await fs.remove(tmp);
  });

  it('validates paths and warns on missing directories', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'build.yaml');
    fs.writeFileSync(cfgPath, [
      'python_version: "3.12"',
      'local_packages:',
      '  - name: missing_pkg',
      '    path: lib/does_not_exist',
      'frontends: []',
      'cli_tools: []',
    ].join('\n'));

    const { loadBuildConfig } = require('../src/lib/build/buildConfig');
    // Should not throw, just warn
    const config = loadBuildConfig(cfgPath, tmp);
    assert.ok(config);
    assert.equal(config.local_packages[0].name, 'missing_pkg');
    await fs.remove(tmp);
  });
});
```

**Step 2: Run tests to verify they fail**
Run: `node --test test/platform.test.js test/buildConfig.test.js`
Expected: FAIL (modules don't exist)

**Step 3: Create src/lib/build/platform.js**
```js
'use strict';

const path = require('path');

function getPlatform() {
  switch (process.platform) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return 'linux';
  }
}

function getPlatformKey() {
  return getPlatform();
}

function getVenvBin(venvPath) {
  if (getPlatform() === 'windows') {
    return path.join(venvPath, 'Scripts', 'python.exe');
  }
  return path.join(venvPath, 'bin', 'python');
}

function getBinDir() {
  const map = { linux: 'bin/linux', macos: 'bin/macos', windows: 'bin/win' };
  return map[getPlatform()];
}

function getBinExt() {
  return getPlatform() === 'windows' ? '.exe' : '';
}

function getScriptExt() {
  return getPlatform() === 'windows' ? '.bat' : '.sh';
}

module.exports = { getPlatform, getPlatformKey, getVenvBin, getBinDir, getBinExt, getScriptExt };
```

**Step 4: Create src/lib/build/buildConfig.js**
```js
'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

function loadBuildConfig(configPath, workspaceRoot) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`build.yaml not found at ${configPath}`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`Error parsing ${configPath}: ${e.message}`);
  }
  if (workspaceRoot) {
    validatePaths(doc, workspaceRoot);
  }
  return doc;
}

function validatePaths(config, workspaceRoot) {
  const path = require('path');
  const sections = [
    { key: 'local_packages', items: config.local_packages || [] },
    { key: 'frontends', items: config.frontends || [] },
    { key: 'cli_tools', items: config.cli_tools || [] },
  ];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.path) {
        const fullPath = path.join(workspaceRoot, item.path);
        if (!fs.existsSync(fullPath)) {
          console.warn(`WARNING: ${section.key}.${item.name} path not found: ${fullPath}`);
        }
      }
    }
  }
}

function resolveTarget(items, name) {
  if (!name) return items || [];
  const found = (items || []).filter(item => item.name === name);
  if (found.length === 0) {
    throw new Error(`Unknown target: ${name}`);
  }
  return found;
}

module.exports = { loadBuildConfig, resolveTarget };
```

**Step 5: Run tests to verify they pass**
Run: `node --test test/platform.test.js test/buildConfig.test.js`
Expected: PASS

**Step 6: Commit**
```bash
git add src/lib/build/platform.js src/lib/build/buildConfig.js test/platform.test.js test/buildConfig.test.js
git commit -m "feat: add platform helpers and build config loader"
```

---

### Task 2: Preflight tool checker with user-prompted install
**Mode:** standard
**Skills:** test-driven-development
**Files:** Create `src/lib/build/preflight.js`, `test/preflight.test.js`

**Step 1: Write the failing test**
Create `test/preflight.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('preflight', () => {
  it('checkTool returns true for node (always available in test)', () => {
    const { checkTool } = require('../src/lib/build/preflight');
    assert.equal(checkTool('node'), true);
  });

  it('checkTool returns false for nonexistent tool', () => {
    const { checkTool } = require('../src/lib/build/preflight');
    assert.equal(checkTool('__nonexistent_tool_xyz__'), false);
  });

  it('getRequiredTools collects tools for given targets', () => {
    const { getRequiredTools } = require('../src/lib/build/preflight');
    const config = {
      preflight_tools: { backends: ['uv'], frontends: ['node', 'npm'], cli: ['go', 'bun'] },
      local_packages: [],
    };
    const tools = getRequiredTools(config, ['backends']);
    assert.deepEqual(tools, ['uv']);
    const all = getRequiredTools(config, ['backends', 'frontends', 'cli']);
    assert.deepEqual(all, ['uv', 'node', 'npm', 'go', 'bun']);
  });

  it('getRequiredTools adds cargo when rust_extension exists and backends selected', () => {
    const { getRequiredTools } = require('../src/lib/build/preflight');
    const config = {
      preflight_tools: { backends: ['uv'], frontends: ['node'], cli: ['go'] },
      local_packages: [{ name: 'pkg', path: 'lib/pkg', rust_extension: { path: 'lib/pkg/rust' } }],
    };
    const tools = getRequiredTools(config, ['backends']);
    assert.ok(tools.includes('cargo'));
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/preflight.test.js`
Expected: FAIL (module doesn't exist)

**Step 3: Create src/lib/build/preflight.js**
```js
'use strict';

const { execSync } = require('child_process');
const { getPlatform } = require('./platform');
const readline = require('readline');

function checkTool(name) {
  try {
    const cmd = getPlatform() === 'windows' ? `where ${name}` : `which ${name}`;
    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function getRequiredTools(config, targets) {
  const tools = [];
  for (const t of targets) {
    const list = (config.preflight_tools || {})[t] || [];
    for (const tool of list) {
      if (!tools.includes(tool)) tools.push(tool);
    }
  }
  // Add cargo if any local_packages have rust_extension and backends is in targets
  if (targets.includes('backends')) {
    const hasRust = (config.local_packages || []).some(p => p.rust_extension);
    if (hasRust && !tools.includes('cargo')) {
      tools.push('cargo');
    }
  }
  return tools;
}

async function promptInstall(toolName, installInfo) {
  const platform = getPlatform();
  const autoCmd = installInfo.auto && installInfo.auto[platform];

  if (!autoCmd) {
    console.error(`ERROR: ${toolName} not found. Install from ${installInfo.url}`);
    return false;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise(resolve => {
    rl.question(`${toolName} not found. Install it? [y/N] `, resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.error(`${toolName} required. Install from ${installInfo.url}`);
    return false;
  }

  try {
    console.log(`Installing ${toolName}...`);
    execSync(autoCmd, { stdio: 'inherit' });
    return checkTool(toolName);
  } catch {
    console.error(`Failed to install ${toolName}. Install manually from ${installInfo.url}`);
    return false;
  }
}

async function runPreflight(config, targets) {
  const tools = getRequiredTools(config, targets);
  const missing = [];

  for (const tool of tools) {
    if (checkTool(tool)) {
      console.log(`[OK] ${tool}`);
    } else {
      missing.push(tool);
    }
  }

  if (missing.length === 0) return true;

  for (const tool of missing) {
    const installInfo = (config.tool_install || {})[tool];
    if (!installInfo) {
      console.error(`ERROR: ${tool} not found and no install info configured`);
      return false;
    }
    const ok = await promptInstall(tool, installInfo);
    if (!ok) return false;
    console.log(`[INSTALLED] ${tool}`);
  }

  return true;
}

module.exports = { checkTool, getRequiredTools, promptInstall, runPreflight };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/preflight.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/build/preflight.js test/preflight.test.js
git commit -m "feat: add preflight tool checker with user-prompted install"
```

---

### Task 3: Backend builder module
**Mode:** standard
**Skills:** test-driven-development
**Files:** Create `src/lib/build/backends.js`, `test/backends.test.js`

**Step 1: Write the failing test**
Create `test/backends.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('backends builder', () => {
  it('buildVenvCmd returns correct uv venv command', () => {
    const { buildVenvCmd } = require('../src/lib/build/backends');
    const cmd = buildVenvCmd('/tmp/venv', '3.12');
    assert.equal(cmd, 'uv venv "/tmp/venv" --python "3.12"');
  });

  it('buildPipInstallCmd returns correct uv pip install command', () => {
    const { buildPipInstallCmd } = require('../src/lib/build/backends');
    const cmd = buildPipInstallCmd('/tmp/venv/bin/python', ['numpy', 'pandas']);
    assert.equal(cmd, 'uv pip install --python "/tmp/venv/bin/python" numpy pandas');
  });

  it('buildLocalInstallCmd handles extras', () => {
    const { buildLocalInstallCmd } = require('../src/lib/build/backends');
    const cmd = buildLocalInstallCmd('/tmp/venv/bin/python', '/workspace/lib/pkg', '[server]');
    assert.equal(cmd, 'uv pip install --python "/tmp/venv/bin/python" -e "/workspace/lib/pkg[server]"');
  });

  it('buildLocalInstallCmd handles no extras', () => {
    const { buildLocalInstallCmd } = require('../src/lib/build/backends');
    const cmd = buildLocalInstallCmd('/tmp/venv/bin/python', '/workspace/lib/pkg', null);
    assert.equal(cmd, 'uv pip install --python "/tmp/venv/bin/python" -e "/workspace/lib/pkg"');
  });

  it('buildVerifyCmd returns python import check', () => {
    const { buildVerifyCmd } = require('../src/lib/build/backends');
    const cmd = buildVerifyCmd('/tmp/venv/bin/python', 'mypkg');
    assert.equal(cmd, '"/tmp/venv/bin/python" -c "import mypkg"');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/backends.test.js`
Expected: FAIL (module doesn't exist)

**Step 3: Create src/lib/build/backends.js**
```js
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getPlatform, getPlatformKey, getVenvBin, getScriptExt } = require('./platform');

function buildVenvCmd(venvPath, pythonVersion) {
  return `uv venv "${venvPath}" --python "${pythonVersion}"`;
}

function buildPipInstallCmd(pythonBin, deps) {
  return `uv pip install --python "${pythonBin}" ${deps.join(' ')}`;
}

function buildLocalInstallCmd(pythonBin, pkgPath, extras) {
  const target = extras ? `${pkgPath}${extras}` : pkgPath;
  return `uv pip install --python "${pythonBin}" -e "${target}"`;
}

function buildVerifyCmd(pythonBin, pkgName) {
  return `"${pythonBin}" -c "import ${pkgName}"`;
}

function runCmd(cmd, opts) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

async function buildBackends(config, workspaceRoot, targetPkg) {
  const platform = getPlatformKey();

  // Resolve primary venv
  const venvConfig = config.venv && config.venv.oceanwave_dash;
  if (!venvConfig) throw new Error('No venv.oceanwave_dash in build.yaml');

  const venvDir = venvConfig.dir[platform];
  if (!venvDir) throw new Error(`No venv dir for platform: ${platform}`);

  const venvPath = path.join(workspaceRoot, venvConfig.path, venvDir);
  const pythonBin = getVenvBin(venvPath);

  const packages = config.local_packages || [];

  // Granular mode: just reinstall the target package
  if (targetPkg) {
    if (!fs.existsSync(venvPath)) {
      throw new Error(`Venv not found at ${venvPath} — run "oceancode build backends" first to create the full environment.`);
    }
    const pkg = packages.find(p => p.name === targetPkg);
    if (!pkg) throw new Error(`Unknown backend package: ${targetPkg}`);

    console.log(`\nRebuilding ${pkg.name}...`);
    const pkgPath = path.join(workspaceRoot, pkg.path);
    runCmd(buildLocalInstallCmd(pythonBin, pkgPath, pkg.extras || null));

    if (pkg.rust_extension) {
      const rustPath = path.join(workspaceRoot, pkg.rust_extension.path);
      runCmd(buildPipInstallCmd(pythonBin, ['maturin']));
      const maturinBin = getPlatform() === 'windows'
        ? path.join(venvPath, 'Scripts', 'maturin.exe')
        : path.join(venvPath, 'bin', 'maturin');
      runCmd(`"${maturinBin}" develop --release`, { cwd: rustPath, env: { ...process.env, VIRTUAL_ENV: venvPath } });
    }

    if (pkg.build_script) {
      const scriptBase = pkg.build_script.replace('{platform}', platform === 'macos' ? 'macos' : (platform === 'windows' ? 'win' : 'linux'));
      const scriptPath = path.join(workspaceRoot, pkg.path, scriptBase + getScriptExt());
      runCmd(getPlatform() === 'windows' ? `call "${scriptPath}"` : `bash "${scriptPath}"`);
    }

    return;
  }

  // Full build
  console.log('\n[1] Creating virtual environment...');
  if (fs.existsSync(venvPath)) {
    console.log('  Removing existing venv...');
    fs.rmSync(venvPath, { recursive: true, force: true });
  }
  runCmd(buildVenvCmd(venvPath, config.python_version || '3.12'));

  console.log('\n[2] Installing PyPI dependencies...');
  const pypiDeps = config.pypi_deps || [];
  if (pypiDeps.length > 0) {
    runCmd(buildPipInstallCmd(pythonBin, pypiDeps));
  }

  console.log('\n[3] Installing local packages...');
  for (const pkg of packages) {
    console.log(`  Installing ${pkg.name}...`);
    const pkgPath = path.join(workspaceRoot, pkg.path);
    runCmd(buildLocalInstallCmd(pythonBin, pkgPath, pkg.extras || null));

    if (pkg.rust_extension) {
      console.log(`  Building ${pkg.name} Rust extension...`);
      const rustPath = path.join(workspaceRoot, pkg.rust_extension.path);
      runCmd(buildPipInstallCmd(pythonBin, ['maturin']));
      const maturinBin = getPlatform() === 'windows'
        ? path.join(venvPath, 'Scripts', 'maturin.exe')
        : path.join(venvPath, 'bin', 'maturin');
      runCmd(`"${maturinBin}" develop --release`, { cwd: rustPath, env: { ...process.env, VIRTUAL_ENV: venvPath } });
    }

    if (pkg.build_script) {
      console.log(`  Running build script for ${pkg.name}...`);
      const scriptBase = pkg.build_script.replace('{platform}', platform === 'macos' ? 'macos' : (platform === 'windows' ? 'win' : 'linux'));
      const scriptPath = path.join(workspaceRoot, pkg.path, scriptBase + getScriptExt());
      runCmd(getPlatform() === 'windows' ? `call "${scriptPath}"` : `bash "${scriptPath}"`);
    }
  }

  // Build additional venvs (oceandata_gui, etc.)
  const venvEntries = Object.entries(config.venv || {}).filter(([k]) => k !== 'oceanwave_dash');
  for (const [name, vCfg] of venvEntries) {
    console.log(`\nBuilding ${name} venv...`);
    const pkg = packages.find(p => p.name === name);
    if (pkg && pkg.build_script) {
      const scriptBase = pkg.build_script.replace('{platform}', platform === 'macos' ? 'macos' : (platform === 'windows' ? 'win' : 'linux'));
      const scriptPath = path.join(workspaceRoot, pkg.path, scriptBase + getScriptExt());
      runCmd(getPlatform() === 'windows' ? `call "${scriptPath}"` : `bash "${scriptPath}"`);
    }
  }

  console.log('\n[4] Verifying installation...');
  let pass = 0, fail = 0;
  for (const pkg of packages) {
    try {
      execSync(buildVerifyCmd(pythonBin, pkg.name), { stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`  [PASS] ${pkg.name}`);
      pass++;
    } catch {
      console.log(`  [FAIL] ${pkg.name}`);
      fail++;
    }
    // Also verify Rust extension module if present
    if (pkg.rust_extension) {
      const extModule = pkg.name + '_rust';
      try {
        execSync(buildVerifyCmd(pythonBin, extModule), { stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(`  [PASS] ${extModule}`);
        pass++;
      } catch {
        console.log(`  [FAIL] ${extModule}`);
        fail++;
      }
    }
  }
  console.log(`\nBackend verification: ${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error('Backend verification failed');
}

module.exports = { buildVenvCmd, buildPipInstallCmd, buildLocalInstallCmd, buildVerifyCmd, buildBackends };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/backends.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/build/backends.js test/backends.test.js
git commit -m "feat: add backend builder module"
```

---

### Task 4: Frontend builder module
**Mode:** standard
**Skills:** test-driven-development
**Files:** Create `src/lib/build/frontends.js`, `test/frontends.test.js`

**Step 1: Write the failing test**
Create `test/frontends.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-fe-'));
}

describe('frontends builder', () => {
  it('getDefaultSteps returns npm install + npm run build', () => {
    const { getDefaultSteps } = require('../src/lib/build/frontends');
    const steps = getDefaultSteps();
    assert.deepEqual(steps, ['npm install', 'npm run build']);
  });

  it('verifyFrontend passes when verify dir exists with files', async () => {
    const tmp = await makeTempDir();
    const feDir = path.join(tmp, 'myfe');
    const distDir = path.join(feDir, 'dist');
    await fs.mkdirp(distDir);
    await fs.writeFile(path.join(distDir, 'index.js'), '// built');

    const { verifyFrontend } = require('../src/lib/build/frontends');
    assert.equal(verifyFrontend(feDir, 'dist'), true);
    await fs.remove(tmp);
  });

  it('verifyFrontend fails when verify dir missing', async () => {
    const tmp = await makeTempDir();
    const feDir = path.join(tmp, 'myfe');
    await fs.mkdirp(feDir);

    const { verifyFrontend } = require('../src/lib/build/frontends');
    assert.equal(verifyFrontend(feDir, 'dist'), false);
    await fs.remove(tmp);
  });

  it('verifyFrontend fails when verify dir empty', async () => {
    const tmp = await makeTempDir();
    const feDir = path.join(tmp, 'myfe');
    const distDir = path.join(feDir, 'dist');
    await fs.mkdirp(distDir);

    const { verifyFrontend } = require('../src/lib/build/frontends');
    assert.equal(verifyFrontend(feDir, 'dist'), false);
    await fs.remove(tmp);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/frontends.test.js`
Expected: FAIL (module doesn't exist)

**Step 3: Create src/lib/build/frontends.js**
```js
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getPlatform } = require('./platform');

function getDefaultSteps() {
  return ['npm install', 'npm run build'];
}

function verifyFrontend(feDir, verifyPath) {
  const fullPath = path.join(feDir, verifyPath);
  if (!fs.existsSync(fullPath)) return false;
  try {
    const entries = fs.readdirSync(fullPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function runCmd(cmd, cwd) {
  console.log(`  $ ${cmd}`);
  const shell = getPlatform() === 'windows' ? 'cmd.exe' : '/bin/sh';
  const shellFlag = getPlatform() === 'windows' ? '/c' : '-c';
  execSync(cmd, { stdio: 'inherit', cwd, shell: true });
}

async function buildFrontends(config, workspaceRoot, targetPkg) {
  const frontends = config.frontends || [];

  const targets = targetPkg
    ? frontends.filter(f => f.name === targetPkg)
    : frontends;

  if (targetPkg && targets.length === 0) {
    throw new Error(`Unknown frontend: ${targetPkg}`);
  }

  let pass = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const fe = targets[i];
    const feDir = path.join(workspaceRoot, fe.path);
    console.log(`\n[${i + 1}/${targets.length}] Building ${fe.name}...`);

    if (!fs.existsSync(feDir)) {
      console.error(`  ERROR: directory not found: ${feDir}`);
      fail++;
      continue;
    }

    const steps = fe.steps || getDefaultSteps();
    try {
      for (const step of steps) {
        runCmd(step, feDir);
      }

      if (fe.verify) {
        if (verifyFrontend(feDir, fe.verify)) {
          console.log(`  [PASS] ${fe.name} verified`);
          pass++;
        } else {
          console.log(`  [FAIL] ${fe.name} verify dir missing or empty: ${fe.verify}`);
          fail++;
        }
      } else {
        pass++;
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nFrontend build: ${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error('Frontend build failed');
}

module.exports = { getDefaultSteps, verifyFrontend, buildFrontends };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/frontends.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/build/frontends.js test/frontends.test.js
git commit -m "feat: add frontend builder module"
```

---

### Task 5: CLI builder module
**Mode:** standard
**Skills:** test-driven-development
**Files:** Create `src/lib/build/cli.js`, `test/cliBuild.test.js`

**Step 1: Write the failing test**
Create `test/cliBuild.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('cli builder', () => {
  it('buildGoCmd returns go build with correct output path', () => {
    const { buildGoCmd } = require('../src/lib/build/cli');
    const cmd = buildGoCmd('/workspace/lib/cli/mycli', '/workspace/bin/linux', 'mycli', '');
    assert.equal(cmd, 'go build -o "/workspace/bin/linux/mycli" .');
  });

  it('buildGoCmd appends .exe on windows', () => {
    const { buildGoCmd } = require('../src/lib/build/cli');
    const cmd = buildGoCmd('/workspace/lib/cli/mycli', '/workspace/bin/win', 'mycli', '.exe');
    assert.equal(cmd, 'go build -o "/workspace/bin/win/mycli.exe" .');
  });

  it('buildBunCmd returns bun build with correct args', () => {
    const { buildBunCmd } = require('../src/lib/build/cli');
    const cmd = buildBunCmd('/workspace/bin/linux', 'mycli', 'src/cli.ts', '');
    assert.equal(cmd, 'bun build src/cli.ts --compile --outfile "/workspace/bin/linux/mycli"');
  });

  it('buildBunCmd appends .exe on windows', () => {
    const { buildBunCmd } = require('../src/lib/build/cli');
    const cmd = buildBunCmd('/workspace/bin/win', 'mycli', 'src/cli.ts', '.exe');
    assert.equal(cmd, 'bun build src/cli.ts --compile --outfile "/workspace/bin/win/mycli.exe"');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/cliBuild.test.js`
Expected: FAIL (module doesn't exist)

**Step 3: Create src/lib/build/cli.js**
```js
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getBinDir, getBinExt } = require('./platform');

function buildGoCmd(toolDir, binDir, name, ext) {
  const outPath = path.join(binDir, name + ext);
  return `go build -o "${outPath}" .`;
}

function buildBunCmd(binDir, name, entry, ext) {
  const outPath = path.join(binDir, name + ext);
  return `bun build ${entry} --compile --outfile "${outPath}"`;
}

function runCmd(cmd, cwd) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

async function buildCli(config, workspaceRoot, targetPkg) {
  const tools = config.cli_tools || [];
  const binDir = path.join(workspaceRoot, getBinDir());
  const ext = getBinExt();

  const targets = targetPkg
    ? tools.filter(t => t.name === targetPkg)
    : tools;

  if (targetPkg && targets.length === 0) {
    throw new Error(`Unknown CLI tool: ${targetPkg}`);
  }

  // Ensure bin dir exists
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  let pass = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const tool = targets[i];
    const toolDir = path.join(workspaceRoot, tool.path);
    console.log(`\n[${i + 1}/${targets.length}] Building ${tool.name} (${tool.type})...`);

    if (!fs.existsSync(toolDir)) {
      console.error(`  ERROR: directory not found: ${toolDir}`);
      fail++;
      continue;
    }

    try {
      switch (tool.type) {
        case 'go':
          runCmd('go mod download', toolDir);
          runCmd(buildGoCmd(toolDir, binDir, tool.name, ext), toolDir);
          break;
        case 'bun':
          runCmd('bun install', toolDir);
          runCmd(buildBunCmd(binDir, tool.name, tool.entry, ext), toolDir);
          break;
        default:
          throw new Error(`Unknown CLI tool type: ${tool.type}`);
      }

      // Verify
      const binPath = path.join(binDir, tool.name + ext);
      if (fs.existsSync(binPath)) {
        console.log(`  [PASS] ${tool.name}`);
        pass++;
      } else {
        console.log(`  [FAIL] ${tool.name} binary not found at ${binPath}`);
        fail++;
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nCLI build: ${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error('CLI build failed');
}

module.exports = { buildGoCmd, buildBunCmd, buildCli };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/cliBuild.test.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/lib/build/cli.js test/cliBuild.test.js
git commit -m "feat: add CLI builder module"
```

---

### Task 6: Build command dispatcher and launch command
**Mode:** full
**Skills:** test-driven-development
**Files:** Create `src/commands/build.js`, `src/commands/launch.js`; Modify `bin/oceancode.js`; Create `test/build.test.js`, `test/launch.test.js`

**Step 1: Write the failing tests**
Create `test/build.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('build command', () => {
  it('parseArgs defaults to all target', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs([]);
    assert.equal(result.target, 'all');
    assert.equal(result.pkg, null);
  });

  it('parseArgs parses target and package', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['backends', 'oceanquant']);
    assert.equal(result.target, 'backends');
    assert.equal(result.pkg, 'oceanquant');
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['frontends', '--config', '/tmp/build.yaml']);
    assert.equal(result.target, 'frontends');
    assert.ok(result.flags.config);
  });

  it('parseArgs parses --skip-preflight flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['--skip-preflight']);
    assert.equal(result.flags.skipPreflight, true);
  });

  it('parseArgs rejects unknown target', () => {
    const { parseArgs } = require('../src/commands/build');
    assert.throws(() => parseArgs(['unknown']), /Unknown build target/);
  });
});
```

Create `test/launch.test.js`:
```js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('launch command', () => {
  it('parseArgs parses app name', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceanwave']);
    assert.equal(result.app, 'oceanwave');
    assert.equal(result.flags.prod, false);
  });

  it('parseArgs parses --prod flag', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceandata', '--prod']);
    assert.equal(result.app, 'oceandata');
    assert.equal(result.flags.prod, true);
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceanwave', '--config', '/tmp/build.yaml']);
    assert.equal(result.app, 'oceanwave');
    assert.ok(result.flags.config);
  });
});
```

**Step 2: Run tests to verify they fail**
Run: `node --test test/build.test.js test/launch.test.js`
Expected: FAIL (modules don't exist)

**Step 3: Create src/commands/build.js**
```js
'use strict';

const path = require('path');
const { loadBuildConfig } = require('../lib/build/buildConfig');
const { runPreflight } = require('../lib/build/preflight');
const { buildBackends } = require('../lib/build/backends');
const { buildFrontends } = require('../lib/build/frontends');
const { buildCli } = require('../lib/build/cli');

const TARGETS = ['all', 'backends', 'frontends', 'cli'];

function usage() {
  console.error('Usage: oceancode build [target] [package] [flags]');
  console.error('');
  console.error('Targets:');
  console.error('  all          Build everything (default)');
  console.error('  backends     Python backend packages');
  console.error('  frontends    Node.js frontend apps');
  console.error('  cli          CLI tool binaries');
  console.error('');
  console.error('Flags:');
  console.error('  --config <path>    Config file (default: ../build.yaml)');
  console.error('  --skip-preflight   Skip tool checks');
  process.exit(1);
}

function parseArgs(args) {
  let target = 'all';
  let pkg = null;
  const flags = { skipPreflight: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--skip-preflight') { flags.skipPreflight = true; continue; }
    if (a === '--help' || a === '-h') usage();
    if (!a.startsWith('-')) {
      if (target === 'all' && TARGETS.includes(a)) { target = a; continue; }
      if (target !== 'all' && !pkg) { pkg = a; continue; }
      if (!TARGETS.includes(a)) throw new Error(`Unknown build target: ${a}`);
    }
  }

  return { target, pkg, flags };
}

async function run(args) {
  const { target, pkg, flags } = parseArgs(args);

  // Resolve config path
  const scriptsDir = path.resolve(__dirname, '..', '..');
  const workspaceRoot = path.resolve(scriptsDir, '..');
  const configPath = flags.config || path.join(workspaceRoot, 'build.yaml');
  const config = loadBuildConfig(configPath);

  // Determine which targets to build
  const buildTargets = target === 'all' ? ['backends', 'frontends', 'cli'] : [target];

  // Preflight
  if (!flags.skipPreflight) {
    console.log('Pre-flight checks...');
    const ok = await runPreflight(config, buildTargets);
    if (!ok) {
      console.error('Pre-flight checks failed');
      process.exit(1);
    }
    console.log('All pre-flight checks passed!\n');
  }

  // Build
  try {
    for (const t of buildTargets) {
      switch (t) {
        case 'backends':
          console.log('========================================');
          console.log(' Building Python Backend');
          console.log('========================================');
          await buildBackends(config, workspaceRoot, pkg);
          break;
        case 'frontends':
          console.log('========================================');
          console.log(' Building Node.js Frontends');
          console.log('========================================');
          await buildFrontends(config, workspaceRoot, pkg);
          break;
        case 'cli':
          console.log('========================================');
          console.log(' Building CLI Tools');
          console.log('========================================');
          await buildCli(config, workspaceRoot, pkg);
          break;
      }
    }
    console.log('\n========================================');
    console.log(' Build Complete!');
    console.log('========================================\n');
  } catch (e) {
    console.error(`\nBuild failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { run, parseArgs };
```

**Step 4: Create src/commands/launch.js**
```js
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { loadBuildConfig } = require('../lib/build/buildConfig');
const { getPlatformKey, getVenvBin } = require('../lib/build/platform');

function usage() {
  console.error('Usage: oceancode launch <app> [flags]');
  console.error('');
  console.error('Apps:   (defined in build.yaml launchers section)');
  console.error('');
  console.error('Flags:');
  console.error('  --prod           Run compiled/packaged version');
  console.error('  --config <path>  Config file (default: ../build.yaml)');
  process.exit(1);
}

function parseArgs(args) {
  let app = null;
  const flags = { prod: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--prod') { flags.prod = true; continue; }
    if (a === '--help' || a === '-h') usage();
    if (!a.startsWith('-') && !app) { app = a; continue; }
  }

  if (!app) usage();
  return { app, flags };
}

async function run(args) {
  const { app, flags } = parseArgs(args);

  const scriptsDir = path.resolve(__dirname, '..', '..');
  const workspaceRoot = path.resolve(scriptsDir, '..');
  const configPath = flags.config || path.join(workspaceRoot, 'build.yaml');
  const config = loadBuildConfig(configPath);

  const launchers = config.launchers || {};
  const launcherCfg = launchers[app];
  if (!launcherCfg) {
    const available = Object.keys(launchers).join(', ');
    console.error(`Unknown app: ${app}. Available: ${available}`);
    process.exit(1);
  }

  const platform = getPlatformKey();

  if (flags.prod) {
    // Prod mode: run binary
    const binaryMap = launcherCfg.prod && launcherCfg.prod.binary;
    if (!binaryMap || !binaryMap[platform]) {
      console.error(`No prod binary configured for ${app} on ${platform}`);
      process.exit(1);
    }
    const binaryPath = path.join(workspaceRoot, binaryMap[platform]);
    if (!fs.existsSync(binaryPath)) {
      console.error(`ERROR: ${binaryPath} not found — run "oceancode build" first`);
      process.exit(1);
    }
    console.log(`Launching ${app} (prod)...`);
    const child = spawn(binaryPath, [], { stdio: 'inherit', cwd: path.dirname(binaryPath) });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  // Dev mode
  const dev = launcherCfg.dev;
  if (!dev) {
    console.error(`No dev configuration for ${app}`);
    process.exit(1);
  }

  if (dev.venv_path && dev.entry) {
    // Python app: use venv python binary directly
    const venvConfig = config.venv && config.venv[app];
    let venvDir;
    if (venvConfig) {
      venvDir = venvConfig.dir[platform];
    } else {
      venvDir = platform === 'windows' ? 'venv-windows' : 'venv-linux';
    }
    const venvPath = path.join(workspaceRoot, dev.venv_path, venvDir);
    const pythonBin = getVenvBin(venvPath);

    if (!fs.existsSync(pythonBin)) {
      console.error(`ERROR: ${pythonBin} not found — run "oceancode build backends" first`);
      process.exit(1);
    }

    const entryPath = dev.entry;
    const cwd = path.join(workspaceRoot, dev.venv_path);
    console.log(`Launching ${app} (dev)...`);
    const child = spawn(pythonBin, [entryPath], { stdio: 'inherit', cwd });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  if (dev.cwd && dev.cmd) {
    // Node/generic app: run command in directory
    const cwd = path.join(workspaceRoot, dev.cwd);
    if (!fs.existsSync(cwd)) {
      console.error(`ERROR: ${cwd} not found`);
      process.exit(1);
    }
    console.log(`Launching ${app} (dev)...`);
    const parts = dev.cmd.split(' ');
    const child = spawn(parts[0], parts.slice(1), { stdio: 'inherit', cwd, shell: true });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  console.error(`Invalid launcher config for ${app}`);
  process.exit(1);
}

module.exports = { run, parseArgs };
```

**Step 5: Update bin/oceancode.js to add build and launch groups**
Add to the GROUPS map:
```js
const GROUPS = {
  sync: path.join(__dirname, '..', 'src', 'commands', 'sync'),
  git: path.join(__dirname, '..', 'src', 'commands', 'git'),
  install: path.join(__dirname, '..', 'src', 'commands', 'install'),
  build: path.join(__dirname, '..', 'src', 'commands', 'build'),
  launch: path.join(__dirname, '..', 'src', 'commands', 'launch'),
};
```

Update the usage message:
```
Usage: oceancode <sync|git|install|build|launch> [action] [args] [flags]

Command groups:
  sync      Sync repos between dev and prod
  git       Git operations across repos
  install   Clone repos from a git server
  build     Build backend, frontend, and CLI packages
  launch    Launch applications (dev or prod mode)
```

**Step 6: Run tests to verify they pass**
Run: `node --test test/build.test.js test/launch.test.js`
Expected: PASS

**Step 7: Commit**
```bash
git add src/commands/build.js src/commands/launch.js bin/oceancode.js test/build.test.js test/launch.test.js
git commit -m "feat: add build and launch command groups to oceancode CLI"
```

---

### Task 7: Create build.yaml, delete legacy files, verify end-to-end
**Mode:** full
**Skills:** test-driven-development
**Files:** Create `/mnt/h/oceanwave/build.yaml`; Delete `build/*.sh`, `build/*.bat`, `launchers/*.sh`, `launchers/*.bat`, `build/`, `launchers/`

**Step 1: Create build.yaml at workspace root**
Create `/mnt/h/oceanwave/build.yaml`:
```yaml
python_version: "3.12"

venv:
  oceanwave_dash:
    path: lib/front_ends/oceanwave_dash
    dir:
      linux: venv-linux
      macos: venv-linux
      windows: venv-windows
  oceandata_gui:
    path: lib/front_ends/oceandata_gui
    dir:
      linux: venv-linux
      macos: venv-linux
      windows: venv-windows

pypi_deps:
  - loguru
  - base36
  - scipy
  - matplotlib
  - plotly
  - bokeh
  - numba
  - pandas
  - numpy
  - toml
  - fastapi
  - uvicorn
  - pydantic
  - httpx
  - pytest
  - pytest-asyncio
  - requests
  - pyyaml
  - python-dateutil
  - gitpython
  - gita
  - "pandas-ta==0.4.71b0"

local_packages:
  - name: jsonldb
    path: lib/jsonldb
  - name: oceancap
    path: lib/oceancap
  - name: oceanutil
    path: lib/oceanutil
  - name: oceandata
    path: lib/oceandata
  - name: oceanseed
    path: lib/oceanseed
  - name: oceanquant
    path: lib/oceanquant
    rust_extension:
      path: lib/oceanquant/oceanquant/rust
  - name: oceanfarm
    path: lib/oceanfarm
  - name: oceanseed_app
    path: lib/back_ends/oceanseed_app
    extras: "[server]"
  - name: oceanfarm_app
    path: lib/back_ends/oceanfarm_app
  - name: oceanhub_app
    path: lib/back_ends/oceanhub_app
    build_script: launch_scripts/{platform}/build_venv
  - name: oceandata_gui
    path: lib/front_ends/oceandata_gui
    build_script: scripts/setup_env

frontends:
  - name: oceanreact
    path: lib/front_ends/oceanreact
    verify: dist
  - name: oceanwave_dash
    path: lib/front_ends/oceanwave_dash
    steps:
      - npm install
      - "npm run install:frontend"
      - "npm run install:oceanreact-local"
      - "npm run build:frontend"
    verify: frontend/dist

cli_tools:
  - name: oceandata
    path: lib/cli/oceandata-cli
    type: go
  - name: oceanlab
    path: lib/cli/oceanlab-cli
    type: bun
    entry: src/cli.ts

launchers:
  oceanwave:
    dev:
      cwd: lib/front_ends/oceanwave_dash
      cmd: npm run dev
    prod:
      binary:
        linux: bin/linux/oceanwave
        macos: bin/macos/oceanwave
        windows: bin/win/oceanwave.exe
  oceandata:
    dev:
      venv_path: lib/front_ends/oceandata_gui
      entry: oceandata_gui/main.py
    prod:
      binary:
        linux: bin/linux/oceandata
        macos: bin/macos/oceandata
        windows: bin/win/oceandata.exe

preflight_tools:
  backends:
    - uv
  frontends:
    - node
    - npm
  cli:
    - go
    - bun

tool_install:
  uv:
    url: "https://docs.astral.sh/uv/"
    auto:
      linux: "curl -LsSf https://astral.sh/uv/install.sh | sh"
      macos: "curl -LsSf https://astral.sh/uv/install.sh | sh"
      windows: "winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements"
  node:
    url: "https://nodejs.org/"
    auto:
      macos: "brew install node"
      windows: "winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements"
  go:
    url: "https://go.dev/"
    auto:
      macos: "brew install go"
      windows: "winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements"
  bun:
    url: "https://bun.sh/"
    auto:
      linux: "curl -fsSL https://bun.sh/install | bash"
      macos: "curl -fsSL https://bun.sh/install | bash"
      windows: "winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements"
  cargo:
    url: "https://rustup.rs/"
    auto:
      linux: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
      macos: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
      windows: "winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements"
```

**Step 2: Delete old files**
```bash
rm build/build_all.sh build/build_all.bat build/build_backends.sh build/build_backends.bat build/build_frontends.sh build/build_frontends.bat build/build_cli.sh build/build_cli.bat
rmdir build
rm launchers/oceanwave.sh launchers/oceanwave.bat launchers/oceandata.sh launchers/oceandata.bat
rmdir launchers
```

**Step 3: Run full test suite**
Run: `node --test test/`
Expected: PASS (all test files)

**Step 4: Verify CLI end-to-end**
```bash
oceancode
# Should print usage with sync|git|install|build|launch

oceancode build
# Should print build usage or attempt preflight

oceancode build --help
# Should print build usage

oceancode launch
# Should print launch usage

oceancode launch --help
# Should print launch usage
```

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: oceancode build/launch complete — remove legacy shell/batch scripts, add build.yaml"
```
