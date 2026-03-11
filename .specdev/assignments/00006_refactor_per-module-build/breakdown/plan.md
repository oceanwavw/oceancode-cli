# Per-Module Build System Implementation Plan

> **For agent:** Implement this plan task-by-task using TDD discipline.

**Goal:** Replace central category-based build system with per-module `oceancode.build.yaml` files. Each module declares its own tools and platform-specific build steps. `oceancode build` becomes a thin step runner.

**Architecture:** Each buildable module has an `oceancode.build.yaml` declaring `tools` (for preflight) and `steps` (flat list or platform-keyed object). `oceancode.yaml` has a `build:` list of active module names. `src/commands/build.js` loads configs, validates, runs preflight, then executes steps per module.

**Tech Stack:** Node.js (CommonJS), js-yaml, @clack/prompts, node:test

---

### Task 1: Build yaml loader and validator

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Create: `src/lib/buildLoader.js`
- Create: `test/buildLoader.test.js`

**Step 1: Write the failing test**

```js
// test/buildLoader.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

describe('buildLoader', () => {
  function tmpBuildYaml(config) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-bl-'));
    fs.writeFileSync(path.join(dir, 'oceancode.build.yaml'), yaml.dump(config));
    return dir;
  }

  it('loads valid flat steps config', () => {
    const dir = tmpBuildYaml({ tools: ['node'], steps: ['npm install', 'npm run build'] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    const result = loadBuildYaml(dir, 'testmod');
    assert.deepEqual(result.tools, ['node']);
    assert.deepEqual(result.steps, ['npm install', 'npm run build']);
  });

  it('loads valid platform-keyed steps config', () => {
    const dir = tmpBuildYaml({
      tools: ['node', 'go'],
      steps: { linux: ['make'], windows: ['nmake'], macos: ['make'] },
    });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    const result = loadBuildYaml(dir, 'testmod');
    assert.deepEqual(result.tools, ['node', 'go']);
    assert.deepEqual(result.steps.linux, ['make']);
  });

  it('throws on missing file', () => {
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml('/nonexistent', 'testmod'), /oceancode\.build\.yaml/);
  });

  it('throws on missing tools key', () => {
    const dir = tmpBuildYaml({ steps: ['npm install'] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /tools.*must be an array/);
  });

  it('throws on missing steps key', () => {
    const dir = tmpBuildYaml({ tools: [] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /steps.*required/);
  });

  it('throws on non-array non-object steps', () => {
    const dir = tmpBuildYaml({ tools: [], steps: 'bad' });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /steps.*must be/);
  });

  it('throws on empty step string', () => {
    const dir = tmpBuildYaml({ tools: [], steps: ['npm install', ''] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /empty step/);
  });

  it('resolveSteps returns flat steps unchanged', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = ['npm install', 'npm run build'];
    assert.deepEqual(resolveSteps(steps, 'linux', 'testmod'), steps);
  });

  it('resolveSteps returns platform-specific steps', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = { linux: ['make'], windows: ['nmake'] };
    assert.deepEqual(resolveSteps(steps, 'linux', 'testmod'), ['make']);
  });

  it('resolveSteps returns null for missing platform', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = { linux: ['make'] };
    assert.equal(resolveSteps(steps, 'macos', 'testmod'), null);
  });

  it('resolveSteps returns empty array for empty platform steps', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = { linux: [], windows: ['nmake'] };
    assert.deepEqual(resolveSteps(steps, 'linux', 'testmod'), []);
  });

  it('validateBuildList validates entries and rejects duplicates', () => {
    const { validateBuildList } = require('../src/lib/buildLoader');
    assert.doesNotThrow(() => validateBuildList(['a', 'b', 'c']));
    assert.throws(() => validateBuildList(['a', 'a']), /Duplicate/);
    assert.throws(() => validateBuildList(['a', '']), /non-empty string/);
    assert.throws(() => validateBuildList(['a', 123]), /non-empty string/);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/buildLoader.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// src/lib/buildLoader.js
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const KNOWN_KEYS = ['tools', 'steps'];

function loadBuildYaml(moduleDir, moduleName) {
  const filePath = path.join(moduleDir, 'oceancode.build.yaml');
  if (!fs.existsSync(filePath)) {
    throw new Error(`oceancode.build.yaml not found in ${moduleDir} for module '${moduleName}'`);
  }
  const doc = yaml.load(fs.readFileSync(filePath, 'utf8')) || {};

  // Warn on unknown keys
  for (const key of Object.keys(doc)) {
    if (!KNOWN_KEYS.includes(key)) {
      console.warn(`Warning: unknown key '${key}' in oceancode.build.yaml for '${moduleName}'`);
    }
  }

  // Validate tools
  if (!Array.isArray(doc.tools)) {
    throw new Error(`oceancode.build.yaml in ${moduleName}: 'tools' must be an array`);
  }

  // Validate steps
  if (doc.steps === undefined || doc.steps === null) {
    throw new Error(`oceancode.build.yaml in ${moduleName}: 'steps' is required`);
  }
  if (Array.isArray(doc.steps)) {
    doc.steps.forEach((s, i) => {
      if (typeof s !== 'string' || s.trim() === '') {
        throw new Error(`oceancode.build.yaml in ${moduleName}: empty step at index ${i}`);
      }
    });
  } else if (typeof doc.steps === 'object') {
    for (const [platform, list] of Object.entries(doc.steps)) {
      if (!Array.isArray(list)) {
        throw new Error(`oceancode.build.yaml in ${moduleName}: steps.${platform} must be an array`);
      }
      list.forEach((s, i) => {
        if (typeof s !== 'string' || s.trim() === '') {
          throw new Error(`oceancode.build.yaml in ${moduleName}: empty step at steps.${platform}[${i}]`);
        }
      });
    }
  } else {
    throw new Error(`oceancode.build.yaml in ${moduleName}: 'steps' must be an array or platform-keyed object`);
  }

  return doc;
}

function resolveSteps(steps, platform, moduleName) {
  if (Array.isArray(steps)) return steps;
  if (platform in steps) return steps[platform];
  return null;
}

function validateBuildList(buildList) {
  const seen = new Set();
  buildList.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error(`Invalid build entry at index ${i}: must be a non-empty string`);
    }
    if (seen.has(entry)) {
      throw new Error(`Duplicate build module '${entry}' in oceancode.yaml`);
    }
    seen.add(entry);
  });
}

module.exports = { loadBuildYaml, resolveSteps, validateBuildList };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/buildLoader.test.js`
Expected: PASS (12 tests)

**Step 5: Commit**
```
git add src/lib/buildLoader.js test/buildLoader.test.js
git commit -m "feat: add build yaml loader with validation"
```

---

### Task 2: Rewrite build command as step runner

**Mode:** full
**Skills:** test-driven-development
**Files:**
- Modify: `src/commands/build.js`
- Modify: `test/build.test.js`

**Step 1: Write the failing test**

```js
// test/build.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('build command', () => {
  it('parseArgs defaults to all modules', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs([]);
    assert.equal(result.module, null);
    assert.equal(result.flags.skipPreflight, false);
  });

  it('parseArgs parses module name', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['dataportal']);
    assert.equal(result.module, 'dataportal');
  });

  it('parseArgs parses --skip-preflight flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['--skip-preflight']);
    assert.equal(result.flags.skipPreflight, true);
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['--config', '/tmp/test.yaml']);
    assert.equal(result.flags.config, '/tmp/test.yaml');
  });

  it('run function is exported', () => {
    const mod = require('../src/commands/build');
    assert.equal(typeof mod.run, 'function');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/build.test.js`
Expected: FAIL — parseArgs signature changed

**Step 3: Write minimal implementation**

```js
// src/commands/build.js
'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { loadConfig, requireSection } = require('../lib/configLoader');
const { loadBuildYaml, resolveSteps, validateBuildList } = require('../lib/buildLoader');
const { checkTool, promptInstall } = require('../lib/build/preflight');
const { getPlatform } = require('../lib/build/platform');
const defaults = require('../lib/defaults');

function usage() {
  console.error('Usage: oceancode build [module] [flags]');
  console.error('');
  console.error('  oceancode build              Build all active modules');
  console.error('  oceancode build <module>      Build a single module');
  console.error('');
  console.error('Flags:');
  console.error('  --config <path>    Config file (default: oceancode.yaml)');
  console.error('  --skip-preflight   Skip tool checks');
  process.exit(1);
}

function parseArgs(args) {
  let module = null;
  const flags = { skipPreflight: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--skip-preflight') { flags.skipPreflight = true; continue; }
    if (a === '--help' || a === '-h') usage();
    if (!a.startsWith('-') && !module) { module = a; continue; }
  }

  return { module, flags };
}

async function run(args) {
  const { module: targetModule, flags } = parseArgs(args);

  const workspaceRoot = process.cwd();
  const config = loadConfig(flags.config);
  requireSection(config, 'build');
  requireSection(config, 'repos');

  const buildList = config.build;
  if (!Array.isArray(buildList)) {
    console.error('Error: build section in oceancode.yaml must be a list of module names');
    process.exit(1);
  }
  validateBuildList(buildList);

  // Filter to single module if specified
  let modulesToBuild = buildList;
  if (targetModule) {
    if (!buildList.includes(targetModule)) {
      console.error(`Module '${targetModule}' is not in the build list. Add it to oceancode.yaml build section.`);
      process.exit(1);
    }
    modulesToBuild = [targetModule];
  }

  // Resolve paths and load build yamls
  const repoMap = config.repos;
  const modules = [];
  for (const name of modulesToBuild) {
    if (!repoMap[name]) {
      console.error(`Build module '${name}' not found in repos config`);
      process.exit(1);
    }
    const moduleDir = path.resolve(workspaceRoot, repoMap[name]);
    if (!require('fs').existsSync(moduleDir)) {
      console.error(`Module '${name}' directory not found: ${moduleDir}`);
      process.exit(1);
    }
    const buildConfig = loadBuildYaml(moduleDir, name);
    modules.push({ name, dir: moduleDir, config: buildConfig });
  }

  // Preflight: collect all tools, deduplicate, check
  if (!flags.skipPreflight) {
    const allTools = [...new Set(modules.flatMap(m => m.config.tools))];
    if (allTools.length > 0) {
      console.log('Pre-flight checks...');
      for (const tool of allTools) {
        if (checkTool(tool)) {
          console.log(`  [OK] ${tool}`);
        } else {
          const installInfo = defaults.toolInstall[tool];
          if (!installInfo) {
            console.error(`  [MISSING] ${tool} — no install info configured`);
            process.exit(1);
          }
          const ok = await promptInstall(tool, installInfo);
          if (!ok) process.exit(1);
          console.log(`  [INSTALLED] ${tool}`);
        }
      }
      console.log('');
    }
  }

  // Execute builds
  const platform = getPlatform();
  let passed = 0, failed = 0, skipped = 0;

  for (const mod of modules) {
    console.log(`[${passed + failed + skipped + 1}/${modules.length}] ${mod.name}`);
    const steps = resolveSteps(mod.config.steps, platform, mod.name);
    if (!steps) {
      console.log(`  skipped — no steps for platform '${platform}'`);
      skipped++;
      continue;
    }

    let stepFailed = false;
    for (let i = 0; i < steps.length; i++) {
      const cmd = steps[i];
      console.log(`  [${i + 1}/${steps.length}] ${cmd}`);
      try {
        execSync(cmd, { cwd: mod.dir, stdio: 'inherit', shell: true });
      } catch (e) {
        console.error(`  FAILED (exit code ${e.status || 1}): ${cmd}`);
        stepFailed = true;
        break;
      }
    }

    if (stepFailed) { failed++; } else { passed++; }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run, parseArgs };
```

**Step 4: Run test to verify it passes**
Run: `node --test test/build.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/build.js test/build.test.js
git commit -m "refactor: rewrite build command as per-module step runner"
```

---

### Task 3: Update init wizard and configGen for new build format

**Mode:** full
**Skills:** test-driven-development
**Files:**
- Modify: `src/commands/init.js`
- Modify: `src/lib/configGen.js`
- Modify: `test/configGen.test.js`
- Modify: `test/init.test.js`

**Step 1: Write the failing test**

Update `test/configGen.test.js` to test that `generateConfig` produces a `build` array (list of module names) instead of the old nested object with `venv`, `frontends`, `cli_tools`, etc.

```js
it('generateConfig produces build as array of module names', () => {
  const { generateConfig } = require('../src/lib/configGen');
  const config = generateConfig({
    prodRoot: '/tmp/prod',
    repos: [{ name: 'oceanfarm', path: 'lib/oceanfarm' }],
    buildModules: ['oceanfarm'],
    launchers: [],
  });
  assert.ok(Array.isArray(config.build));
  assert.deepEqual(config.build, ['oceanfarm']);
});
```

Update `test/init.test.js` to verify init still exports parseArgs and run:

```js
it('parseArgs returns empty flags by default', () => {
  const { parseArgs } = require('../src/commands/init');
  const result = parseArgs([]);
  assert.deepEqual(result.flags, {});
});

it('run function is exported', () => {
  const init = require('../src/commands/init');
  assert.ok(typeof init.run === 'function');
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/configGen.test.js`
Expected: FAIL — build is still an object

**Step 3: Write minimal implementation**

Modify `src/lib/configGen.js` — replace the old build section generation with:
```js
config.build = opts.buildModules || [];
```

Remove all `venv`, `frontends`, `cli_tools`, `pypi_deps`, `local_packages`, `preflight_tools`, `tool_install` generation.

Modify `src/commands/init.js`:
- Remove the 3 separate multiselects for venv/frontend/go targets
- Remove the python version text prompt
- Instead: scan each selected repo's path for `oceancode.build.yaml` presence
- Single multiselect: "Select modules to build:" showing only repos that have `oceancode.build.yaml`
- Pass `buildModules` (array of names) to `generateConfig`

**Step 4: Run test to verify it passes**
Run: `node --test test/configGen.test.js test/init.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/commands/init.js src/lib/configGen.js test/configGen.test.js test/init.test.js
git commit -m "refactor: init wizard uses single build module selection"
```

---

### Task 4: Clean up defaults.js

**Mode:** standard
**Skills:** test-driven-development
**Files:**
- Modify: `src/lib/defaults.js`
- Modify: `test/defaults.test.js` (if exists)

**Step 1: Write the failing test**

Add test to `test/defaults.test.js` verifying removed keys no longer exist:

```js
it('defaults does not export pythonVenvTargets, frontendTargets, goTargets, preflightTools', () => {
  const defaults = require('../src/lib/defaults');
  assert.equal(defaults.pythonVenvTargets, undefined);
  assert.equal(defaults.frontendTargets, undefined);
  assert.equal(defaults.goTargets, undefined);
  assert.equal(defaults.preflightTools, undefined);
});

it('defaults still exports toolInstall', () => {
  const defaults = require('../src/lib/defaults');
  assert.ok(defaults.toolInstall);
  assert.ok(defaults.toolInstall.node);
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/defaults.test.js`
Expected: FAIL — keys still exist

**Step 3: Write minimal implementation**

Remove from `src/lib/defaults.js`:
- `pythonVenvTargets` array
- `frontendTargets` array
- `goTargets` array
- `preflightTools` object
- `pypiDeps` array

Keep: `repos`, `launchers`, `launcherConfigs`, `toolInstall`.

**Step 4: Run test to verify it passes**
Run: `node --test test/defaults.test.js`
Expected: PASS

**Step 5: Commit**
```
git add src/lib/defaults.js test/defaults.test.js
git commit -m "refactor: remove category-based build targets from defaults"
```

---

### Task 5: Delete old build system files and update help

**Mode:** full
**Skills:** test-driven-development
**Files:**
- Delete: `src/lib/build/backends.js`
- Delete: `src/lib/build/frontends.js`
- Delete: `src/lib/build/cli.js`
- Delete: `test/backends.test.js`
- Delete: `test/frontends.test.js`
- Delete: `test/cliBuild.test.js`
- Delete: `test/preflight.test.js`
- Modify: `bin/oceancode.js` (update help text for build command)

**Step 1: Write the failing test**

Add a test to `test/buildLoader.test.js` that verifies old builder modules no longer exist:

```js
it('old category builders are deleted', () => {
  const fs = require('fs');
  const path = require('path');
  const srcDir = path.join(__dirname, '..', 'src', 'lib', 'build');
  assert.equal(fs.existsSync(path.join(srcDir, 'backends.js')), false, 'backends.js should be deleted');
  assert.equal(fs.existsSync(path.join(srcDir, 'frontends.js')), false, 'frontends.js should be deleted');
  assert.equal(fs.existsSync(path.join(srcDir, 'cli.js')), false, 'cli.js should be deleted');
});
```

**Step 2: Run test to verify it fails**
Run: `node --test test/buildLoader.test.js`
Expected: FAIL — files still exist

**Step 3: Write minimal implementation**

- Delete `src/lib/build/backends.js`, `src/lib/build/frontends.js`, `src/lib/build/cli.js`
- Delete `test/backends.test.js`, `test/frontends.test.js`, `test/cliBuild.test.js`, `test/preflight.test.js`
- Keep `src/lib/build/preflight.js` (still used for `checkTool`/`promptInstall`)
- Keep `src/lib/build/platform.js` (still used for `getPlatform`)
- Update `bin/oceancode.js` HELP text: change build section from category-based to module-based

**Step 4: Run test to verify it passes**
Run: `node --test test/*.test.js`
Expected: ALL PASS

**Step 5: Commit**
```
git rm src/lib/build/backends.js src/lib/build/frontends.js src/lib/build/cli.js
git rm test/backends.test.js test/frontends.test.js test/cliBuild.test.js test/preflight.test.js
git add bin/oceancode.js test/buildLoader.test.js
git commit -m "refactor: delete old category-based builders, update help"
```
