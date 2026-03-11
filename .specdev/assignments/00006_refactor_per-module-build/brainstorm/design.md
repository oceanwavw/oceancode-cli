# Design: Per-Module Build System

## Overview

Refactor the build system from central category-based logic to per-module `oceancode.build.yaml` files. Each buildable module declares its required tools and build steps (with platform variants). `oceancode build` becomes a step runner that iterates active modules, checks tools, and executes steps.

## Non-Goals

- Dependency ordering between modules (build order follows repo order in config)
- Parallel builds
- Build caching or incremental builds
- Changing the launcher system (remains separate)

## Design

### Per-module `oceancode.build.yaml`

Each buildable module has an `oceancode.build.yaml` at its root:

```yaml
# Simple — same steps on all platforms
tools: [node, npm]
steps:
  - npm install
  - npm run build
```

```yaml
# Platform-specific steps
tools: [node, npm, go]
steps:
  linux:
    - npm install
    - npm run build
    - go build -o bin/linux/dataportal ./go_backend
  windows:
    - npm install
    - npm run build
    - go build -o bin/win/dataportal.exe ./go_backend
  macos:
    - npm install
    - npm run build
    - go build -o bin/macos/dataportal ./go_backend
```

Format rules:
- `tools:` — required, list of string CLI tool names for preflight checks (may be empty `[]`)
- `steps:` — required, either a flat list of strings (all platforms) or an object keyed by `linux`/`windows`/`macos` where each value is a list of strings
- Steps are shell commands run with `execSync` in the module's directory
- If the current platform key is missing from a platform-keyed steps object, skip with a warning

Validation (fail-fast on load, before any builds run):
- `tools` missing or not an array → error: `"oceancode.build.yaml in <module>: 'tools' must be an array"`
- `steps` missing → error: `"oceancode.build.yaml in <module>: 'steps' is required"`
- `steps` is neither an array nor an object → error with clear message
- Empty command strings in steps → error: `"oceancode.build.yaml in <module>: empty step at index N"`
- Unknown top-level keys → warning (non-fatal), allows forward compatibility

### `oceancode.yaml` build section

The config's build section simplifies to a list of active module names:

```yaml
build:
  - dataportal
  - oceandata_tau
  - oceanwave_dash
  - oceandata-cli
```

Only modules listed here are built by `oceancode build`. Each must have an `oceancode.build.yaml` in its repo directory.

### `oceancode build` command

Revised flow:
1. Load `oceancode.yaml`, read `build` list and `repos` map
2. Validate `build` list entries: each must be a non-empty string — fail-fast with `"Invalid build entry at index N: must be a non-empty string"`. Duplicates rejected with `"Duplicate build module '<name>' in oceancode.yaml"`
3. Validate: each module in `build` must exist in `repos` — fail-fast with `"Build module '<name>' not found in repos config"` if missing
3. Validate: each module's repo directory must exist — fail-fast with `"Module '<name>' directory not found: <path>"`
4. Read and validate each module's `oceancode.build.yaml` — fail-fast on schema errors (see validation rules above)
5. Collect all required tools across modules, deduplicate, run preflight checks (with auto-install prompts)
6. For each module, resolve steps for current platform
7. Execute steps sequentially in the module's directory (`cwd` = module path, `shell: true`, `stdio: 'inherit'`)
8. Report pass/fail/skip per module

Error handling during execution:
- If a step fails within a module: stop that module immediately, log the failed command and exit code, mark module as failed, continue to next module
- After all modules: print summary (N passed, N failed, N skipped), exit code 1 if any failed
- Step output (stdout/stderr) streams directly to terminal via `stdio: 'inherit'`

CLI interface:
- `oceancode build` — build all active modules from `build` list
- `oceancode build <module-name>` — build a single module; must be in the `build` list (acts as allowlist). Error if not listed: `"Module '<name>' is not in the build list. Add it to oceancode.yaml build section."`
- `--skip-preflight` — skip tool checks
- `--config <path>` — override config path

### Init wizard changes

Replace the 3 separate multiselects (Python venv targets, Frontend targets, Go targets) with:
1. Scan repo dirs for `oceancode.build.yaml` presence
2. Single multiselect: "Select modules to build:" with hints showing tool requirements
3. Write selected names to `build:` list in `oceancode.yaml`

### Preflight changes

- Remove hardcoded tool-to-category mapping from `defaults.js` (`preflightTools`)
- Collect required tools from each active module's `oceancode.build.yaml` `tools:` field
- Deduplicate, check availability, prompt for install — reuse existing `checkTool`/`promptInstall` logic
- Keep `toolInstall` map in defaults.js (install commands per tool per platform)

### Files to delete

- `src/lib/build/backends.js` — replaced by per-module steps
- `src/lib/build/frontends.js` — replaced by per-module steps
- `src/lib/build/cli.js` — replaced by per-module steps
- `src/lib/build/preflight.js` — logic moves into build.js runner
- `test/backends.test.js`
- `test/frontends.test.js`
- `test/cliBuild.test.js`
- `test/preflight.test.js`

### Files to modify

- `src/commands/build.js` — rewrite as yaml step runner
- `src/commands/init.js` — single build module multiselect
- `src/lib/defaults.js` — remove `pythonVenvTargets`, `frontendTargets`, `goTargets`, `preflightTools`
- `test/build.test.js` — rewrite for new runner
- `test/init.test.js` — update for new wizard flow

### Files to create

- `oceancode.build.yaml` in each buildable module repo (external to this CLI repo)

## Key Decisions

1. **Flat shell commands, not structured build types** — modules know how to build themselves, no abstraction needed
2. **Platform keys in yaml, not runtime detection in build logic** — each module declares platform-specific commands explicitly
3. **Active modules listed in `oceancode.yaml`** — not auto-discovered, gives user control over what builds
4. **Tools declared per module** — preflight aggregates across active modules, no central mapping

## Success Criteria

1. Each buildable module has an `oceancode.build.yaml` with `tools` and `steps` (platform-aware)
2. `oceancode build` reads active modules from `oceancode.yaml`, runs their steps for the current platform
3. `oceancode build <module>` runs a single module's steps
4. Missing tools trigger preflight prompts with auto-install
5. `oceancode init` shows a single "select build modules" multiselect instead of 3 category lists
6. `src/lib/build/backends.js`, `frontends.js`, `cli.js` deleted
7. `defaults.js` no longer has `pythonVenvTargets`, `frontendTargets`, `goTargets`
8. All existing tests updated or replaced, all pass

## Testing Approach

- Unit test the yaml loader (valid yaml, missing file, missing platform key)
- Unit test step resolution (flat list vs platform-keyed, unknown platform)
- Unit test preflight tool aggregation from multiple modules
- Integration test: mock `execSync`, verify steps run in correct order and cwd
- Test `oceancode build <module>` filters correctly
