# Design — Interactive Init Command

## Overview

`oceancode init` is an interactive wizard that generates `sync_repos.yaml` and `build.yaml` at a workspace root using `@clack/prompts`. It uses hardcoded defaults in `src/lib/defaults.js` — the known OceanWave repos, packages, frontends, CLI tools, and launchers — presented as multi-select lists. Users check/uncheck what they need.

Beyond init, all major commands (`install`, `git`, `build`, `sync`, `launch`) gain interactive multi-select prompts when invoked without explicit target arguments. When args are provided, prompts are skipped to preserve scriptability.

`@clack/prompts` is added as a regular dependency (~30KB, CommonJS compatible, zero build step) for reuse across all commands.

## Goals

1. **Interactive config generation** — guide users through creating `sync_repos.yaml` and `build.yaml` via prompted multi-selects from hardcoded defaults
2. **Skippable sections** — user can skip any section (sync, python, frontend, go, launchers) in the init wizard
3. **Edit existing configs** — when config files already exist, ask user if they want to overwrite; if declined, skip that section
4. **Location-agnostic** — works from any directory; asks for dev workspace root (defaults to cwd) and prod directory path
5. **Multi-select across commands** — `install`, `git`, `build`, `sync`, `launch` all gain interactive pickers when no args given
6. **Scriptable** — all prompts skipped when CLI args are provided explicitly

## Non-Goals

- Validating that discovered packages actually build — init only generates config
- Managing prod directory structure — init asks for the path but doesn't create or modify it
- Full TUI dashboard — this uses step-through prompts, not persistent terminal UI
- Replacing manual YAML editing — power users can still hand-edit configs
- Auto-detecting launcher configurations — launchers use hardcoded defaults since entry points can't be reliably discovered

## Design

### New Files

- `src/lib/defaults.js` — hardcoded registry of all known OceanWave repos, packages, frontends, CLI tools, and launchers
- `src/commands/init.js` — init wizard command

### Modified Files

- `bin/oceancode.js` — add `init` to GROUPS map
- `src/commands/install.js` — add multi-select repo prompt
- `src/commands/git.js` — add multi-select repo prompt
- `src/commands/build.js` — add multi-select target/package prompt
- `src/commands/sync.js` — add multi-select repo prompt
- `src/commands/launch.js` — add select prompt from hardcoded app list
- `package.json` — add `@clack/prompts` dependency

### defaults.js Structure

```js
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
};
```

### Generated YAML Schemas

**sync_repos.yaml** (must match `src/lib/config.js` loader — requires top-level `repos` object map of `name: path`):
```yaml
repos:
  oceanfarm: lib/oceanfarm
  oceanquant: lib/oceanquant
  # ... selected repos as key-value pairs
```

**build.yaml** (must match `src/lib/build/buildConfig.js` and `src/commands/launch.js`):
```yaml
python_version: "3.12"

venv:
  oceanwave_dash:
    path: lib/front_ends/oceanwave_dash
    dir:
      linux: venv-linux
      macos: venv-linux
      windows: venv-windows
  # ... one entry per selected python venv target

pypi_deps:
  - loguru
  - pandas
  # ... hardcoded common deps from defaults.js

local_packages:
  - name: jsonldb
    path: lib/jsonldb
  # ... dependencies of selected venv targets

frontends:
  - name: oceanreact
    path: lib/front_ends/oceanreact
    verify: dist
  # ... selected frontend targets

cli_tools:
  - name: oceandata
    path: lib/cli/oceandata-cli
    type: go
  # ... selected go/bun targets

launchers:
  oceanwave_dash:
    dev:
      cwd: lib/front_ends/oceanwave_dash
      cmd: npm run dev
    prod:
      binary:
        linux: bin/linux/oceanwave
        macos: bin/macos/oceanwave
        windows: bin/win/oceanwave.exe
  # ... selected launchers

preflight_tools:
  backends:
    - uv
  frontends:
    - node
    - npm
  cli:
    - go

tool_install:
  uv:
    url: "https://docs.astral.sh/uv/"
    auto:
      linux: "curl -LsSf https://astral.sh/uv/install.sh | sh"
      macos: "curl -LsSf https://astral.sh/uv/install.sh | sh"
      windows: "winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements"
  # ... hardcoded tool install info from defaults.js
```

The exact field values (venv dirs, launcher dev/prod entries, pypi_deps, preflight_tools, tool_install) are hardcoded in `defaults.js`. The wizard only asks the user *which* targets to include — the config details are filled in automatically.

### Init Wizard Flow

1. Intro banner
2. Text input: dev workspace root (default: cwd)
3. Text input: prod directory path
4. **Sync section** (skippable): multi-select from `defaults.repos` → generates `sync_repos.yaml`
   - If `sync_repos.yaml` exists: "Config exists. Overwrite? [y/N]" — if N, skip
5. **Build section** (skippable): generates `build.yaml`
   - If `build.yaml` exists: "Config exists. Overwrite? [y/N]" — if N, skip
   - Multi-select Python venv targets from `defaults.pythonVenvTargets`
   - Multi-select frontend targets from `defaults.frontendTargets`
   - Multi-select Go targets from `defaults.goTargets`
   - Python version input (default: 3.12)
6. **Launch section** (skippable): multi-select launchers from `defaults.launchers`
7. Preview generated YAML
8. Confirm and write files

### Command Prompt Integration Pattern

Each command follows the same pattern:

```js
async function run(args) {
  const parsed = parseArgs(args);
  // If no target/repo specified AND stdin is interactive, show prompt
  if (!parsed.target && process.stdin.isTTY) {
    const { multiselect } = require('@clack/prompts');
    parsed.target = await multiselect({ ... });
  }
  // Continue with existing logic
}
```

- `install`: prompt for `base-url` (text input), then multi-select which repos to clone (from sync_repos.yaml). Prompts only when `base-url` arg is missing AND TTY.
- `git`: prompt for action (select from ACTIONS list), then multi-select repos, then prompt for `-t` path (text input). Required flags (`-t`) are prompted when missing AND TTY; when not TTY, existing error behavior is preserved.
- `build`: multi-select target category (backends/frontends/cli), then specific packages within chosen category. Only prompted when no target arg given AND TTY.
- `sync`: prompt for action (select from dev2prod/prod2dev/prune), then multi-select repos, then prompt for `-s` and `-t` paths. Required flags are prompted when missing AND TTY.
- `launch`: select single app from hardcoded launcher list. Only prompted when no app arg given AND TTY.

### Non-Interactive Fallback

If stdin is not a TTY (piped/CI), skip prompts entirely:
- `init`: exit with message "Run oceancode init in an interactive terminal"
- Other commands: fall through to existing behavior (operate on all targets)

## Error Handling

- **Invalid workspace root** — if path doesn't exist, show error and re-prompt
- **Invalid prod path** — same treatment
- **YAML write failure** — atomic writes via temp file + rename (`fs.writeFileSync` to `<file>.tmp`, then `fs.renameSync` to final path). On error, temp file is cleaned up, original config untouched.
- **User cancels** (Ctrl+C) — clack handles this gracefully, exit cleanly
- **Empty selection** — warn user "Nothing selected, skipping section"

## Success Criteria

1. `oceancode init` generates valid `sync_repos.yaml` loadable by `src/lib/config.js`
2. `oceancode init` generates valid `build.yaml` loadable by `src/lib/build/buildConfig.js`
3. Existing config handling — user prompted to overwrite; if declined, section skipped
4. All sections independently skippable
5. Multi-select defaults — all known items pre-checked
6. Non-interactive fallback — exits gracefully when not a TTY
7. All 6 commands (`init`, `install`, `git`, `build`, `sync`, `launch`) gain interactive prompts
8. Existing CLI args still work — prompts skipped when args provided
9. Tests pass — unit tests for defaults registry and config generation; command tests verify prompt-skip when args given
10. `@clack/prompts` added as regular dependency

## Testing Approach

- Unit test `defaults.js` — verify all entries have required fields
- Unit test config generation functions — given selected items, verify valid YAML output
- Unit test each command's arg parsing — verify prompts are skipped when args provided
- Integration test: mock `@clack/prompts` to simulate selections, verify generated files
