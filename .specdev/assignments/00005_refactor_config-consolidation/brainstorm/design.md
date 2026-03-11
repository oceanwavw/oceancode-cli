# Design — Config Consolidation & Command Renames

## Overview

This refactor consolidates the two separate config files (`sync_repos.yaml` + `build.yaml`) into a single `oceancode.yaml`, renames/splits commands to make dev vs prod explicit, and enforces that `oceancode` must be run from the dev workspace root. The goal is a cleaner architecture where dev root = cwd, prod root comes from config, and there's no ambiguity about which environment a command operates on.

**Command changes:**
- `install` → `clone-prod`
- `git` → `git-dev` (status only) + `git-prod` (full ops)
- `build` / `launch` — unchanged (always dev)
- `sync` — unchanged (paths from config instead of flags)

## Non-Goals

- **No `build-prod` / `launch-prod`** — prod is source-only, builds happen in dev
- **No backward compatibility** with old `sync_repos.yaml` / `build.yaml` — clean break, `init` regenerates
- **No `dev_root` in config** — cwd is always dev root
- **No config discovery via walk-up** — must run from dev root, error if `oceancode.yaml` not in cwd
- **No `git-dev fetch`** — dev repos are worked on individually, only batch `status` is needed
- **No `~/.oceancode.yaml` global config** — workspace-specific only

## Design

### Config — `oceancode.yaml`

```yaml
workspace:
  prod_root: /path/to/prod

repos:
  oceanfarm: lib/oceanfarm
  oceanquant: lib/oceanquant
  # ...

build:
  python_version: "3.12"
  venv:
    oceanwave_dash: { path: lib/front_ends/oceanwave_dash, dir: { ... } }
    # ...
  pypi_deps: [...]
  local_packages: [...]
  frontends: [...]
  cli_tools: [...]
  preflight_tools: { ... }
  tool_install: { ... }

launchers:
  oceanwave_dash: { dev: { ... }, prod: { ... } }
  # ...
```

Partial config support: `--config custom.yaml` with only the sections a command needs. The loader itself does not validate sections — each command checks for the sections it requires.

### Config Loader — Single Unified Loader

- Replaces `src/lib/config.js` (sync repos) and `src/lib/build/buildConfig.js`
- Reads `oceancode.yaml` from cwd by default, or from `--config` flag
- If `oceancode.yaml` not found in cwd and no `--config`: error with message "Run from your dev workspace root, or pass --config"
- Returns full config object; each command picks the sections it needs
- `repos:` section uses same object map format (`name: path`)

### Required Sections per Command

Each command validates that its required config sections exist and provides a clear error if missing:

| Command | Required sections |
|---------|------------------|
| `init` | (none — generates config) |
| `clone-prod` | `workspace.prod_root`, `repos` |
| `sync` | `workspace.prod_root`, `repos` |
| `git-dev` | `repos` |
| `git-prod` | `workspace.prod_root`, `repos` |
| `build` | `build` |
| `launch` | `launchers` |

Error format: `"Missing config section '<section>'. Run 'oceancode init' to generate oceancode.yaml."`

### Path Resolution Rules

- `workspace.prod_root` — always resolved as absolute. If relative, resolved against cwd (dev root).
- `repos` paths — always relative to workspace root (dev root = cwd). Never absolute.
- `--config <path>` — the config file path is resolved against cwd. All paths *inside* the config are still resolved against cwd (not the config file directory). This keeps behavior consistent: cwd is always the reference point.

### Command Changes

| Command | Key changes |
|---------|------------|
| `init` | Writes single `oceancode.yaml` instead of two files. Asks for `prod_root` path. No `dev_root` prompt (cwd). |
| `clone-prod` | Renamed from `install`. Reads `prod_root` from config. Clones into `prod_root`. |
| `sync` | Reads `dev_root` (cwd) and `prod_root` from config. `-s`/`-t` flags removed. |
| `git-dev` | New command. Only supports `status`. Operates on dev repos at cwd. No `.prodroot` guard needed. |
| `git-prod` | Extracted from `git`. Full ops (status, commit, push, pull, fetch, init, remote-add). Operates on `prod_root` from config. `.prodroot` guard kept. `git-prod init` seeds `.gitignore`. |
| `build` | Resolves workspace root from cwd instead of `__dirname`. No other changes. |
| `launch` | Same — resolves from cwd. `--prod` flag stays (dev source vs compiled binary, both in dev tree). |

### `.gitignore` Seeding on `git-prod init`

Default entries:
```
bin/
*.exe
*.pyc
__pycache__/
node_modules/
dist/
venv-*/
*.egg-info/
.DS_Store
```

**Merge behavior:** If `.gitignore` already exists, append only entries not already present (line-by-line dedup). Never overwrite or remove existing entries. This makes the operation idempotent — running `git-prod init` twice produces the same result.

### Dispatcher Update (`bin/oceancode.js`)

- Remove `git`, `install` from GROUPS
- Add `git-dev`, `git-prod`, `clone-prod`
- Hyphenated commands map to files: `git-dev` → `src/commands/git-dev.js`

## Success Criteria

1. Single `oceancode.yaml` replaces both `sync_repos.yaml` and `build.yaml`
2. `oceancode init` generates valid `oceancode.yaml` with `workspace.prod_root`, `repos`, `build`, and `launchers` sections
3. Partial config works — `--config subset.yaml` with only needed sections doesn't error
4. Config loaded from cwd; error message when `oceancode.yaml` not found and no `--config`
5. `clone-prod` clones into `prod_root` from config (no cwd assumption)
6. `sync` reads both paths from config, no `-s`/`-t` flags required
7. `git-dev status` shows status across dev repos at cwd
8. `git-prod` supports full ops, reads `prod_root` from config
9. `git-prod init` seeds `.gitignore` before first commit
10. `build` and `launch` resolve workspace from cwd, not `__dirname`
11. Old `config.js` and `buildConfig.js` loaders replaced by unified loader
12. All existing tests updated, all tests pass
13. Interactive prompts preserved on all commands (TTY guard pattern)

## Implementation Sequencing

This refactor is staged to keep each step independently testable:

1. **Unified config loader** — new `src/lib/configLoader.js` that reads `oceancode.yaml` with section validation and path resolution. Old loaders untouched. Tests for new loader.
2. **Migrate commands to new loader** — switch `sync`, `build`, `launch` to use `configLoader.js`. Update tests. Remove `-s`/`-t` from sync. Remove `__dirname` from build/launch. Old loaders still exist but unused.
3. **Command renames** — rename `install` → `clone-prod`, split `git` → `git-dev` + `git-prod`. Update dispatcher. New tests.
4. **`.gitignore` seeding** — add merge-safe `.gitignore` seeding to `git-prod init`.
5. **Update `init` wizard** — generate single `oceancode.yaml` instead of two files.
6. **Cleanup** — delete old `config.js`, `buildConfig.js`, old tests, old command files.

## Testing Approach

- Unit tests for unified config loader (full config, partial config, missing file error)
- Unit tests for `git-dev` (status only, rejects other actions)
- Unit tests for `git-prod` (all actions, `.gitignore` seeding)
- Unit tests for `clone-prod` (parseArgs, reads prod_root from config)
- Update existing `sync`, `build`, `launch` tests for new config format
- Integration test: `init` generates valid `oceancode.yaml` loadable by unified loader
