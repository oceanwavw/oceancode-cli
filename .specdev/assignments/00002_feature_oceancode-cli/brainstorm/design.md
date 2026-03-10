# Design: oceancode CLI

## Overview

Refactor `scripts/` from three standalone Node.js scripts into a single `oceancode` CLI with a dispatcher pattern. Entry point at `bin/oceancode.js` parses command group (`sync`, `git`, `install`) and dispatches to modules under `src/commands/`. Existing lib internals (shared, walker, dev2prod, prod2dev, prune, guards) are preserved and moved to `src/lib/`. Config moves from `sync_repos.json` to `sync_repos.yaml` at the workspace root — repo map only.

## Goals

1. Single CLI entry point: `oceancode <command-group> <action> [args] [flags]`
2. Three command groups: `sync`, `git`, `install`
3. Config file `sync_repos.yaml` at workspace root — repo map only, no machine-specific paths
4. All machine-specific paths (`-s`, `-t`) passed as command args
5. `.prodroot` guard on destructive git commands (commit, push, pull, init, remote-add)
6. Works on WSL2, Linux, and macOS (no platform-specific code, but no targeted cross-platform test suite)
7. Installable globally via `npm link`

## Non-Goals

- Build script absorption (`oceancode build`) — future assignment
- Launcher management — future assignment
- Replacing `scripts/` folder structure — stay in place for now
- GUI or interactive prompts — CLI only, explicit flags
- Config file discovery (walking up directories) — read from known path

## Design

### File Structure

```
scripts/
  bin/oceancode.js          # shebang entry point, dispatcher
  src/
    commands/
      sync.js               # dev2prod, prod2dev, prune
      git.js                # status, commit, push, pull, fetch, remote-add, init
      install.js            # clone all repos
    lib/
      shared.js             # SAFETY_NEGATIONS, normalizePath, parseProdinclude, isFileMatch, shouldSkipFile
      walker.js             # walkTree
      dev2prod.js           # dev2prod sync logic
      prod2dev.js           # prod2dev sync logic
      prune.js              # prune logic
      guards.js             # direction guards (.prodroot, .prodinclude)
  test/
    sync.test.js            # sync command tests
    git.test.js             # git command tests
  build/                    # unchanged
  launchers/                # unchanged
  docs/                     # unchanged
  package.json              # name: "oceancode", bin: { "oceancode": "./bin/oceancode.js" }
```

### Command Syntax

```bash
# === sync ===
oceancode sync dev2prod -s <source> -t <target>                          # all repos
oceancode sync dev2prod oceanfarm,oceanquant -s <source> -t <target>     # specific repos
oceancode sync dev2prod oceanfarm -s ... -t ... --mirror --force --dry-run
oceancode sync prod2dev oceanfarm -s ... -t ...
oceancode sync prune oceanfarm -s ... -t ... --dry-run

# === git ===
oceancode git status -t <path>                          # all repos, no guard
oceancode git fetch origin -t <path>                    # all repos, no guard
oceancode git init -t <path>                            # requires .prodroot
oceancode git commit "message" -t <path>                # requires .prodroot
oceancode git push origin -t <path>                     # requires .prodroot
oceancode git pull origin -t <path>                     # requires .prodroot
oceancode git remote-add origin <url> -t <path>         # requires .prodroot
oceancode git status oceanfarm,oceanquant -t <path>     # specific repos

# === install ===
oceancode install <base-url>
```

### Config: sync_repos.yaml

Resolved via `--config <path>` flag or `./sync_repos.yaml` in cwd. Repo map only — no machine-specific paths.

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

### Dispatcher Pattern

`bin/oceancode.js` parses argv:
- arg[0] = command group (sync, git, install)
- Remaining args passed to command handler
- Each command handler parses its own flags

### Error Handling

- Unknown command group → print usage and exit 1
- Unknown action (e.g. `oceancode sync foo`) → print command-specific usage and exit 1
- Missing required flags (`-s`/`-t` for sync, `-t` for git) → error message naming the missing flag and exit 1
- Unknown repo name in comma list → error listing all unknown names and exit 1
- Config not found → error: `sync_repos.yaml not found at <path>` and exit 1
- Config parse failure → error with YAML parse message and exit 1
- Config missing `repos` key → error: `sync_repos.yaml: missing "repos" key` and exit 1

### Config Resolution

Config location is resolved in order:
1. `--config <path>` flag (explicit override)
2. `./sync_repos.yaml` (current working directory)

If neither exists, exit with error. No upward directory walking.

### Dependencies

- `js-yaml` — YAML parser (new dependency)
- `fs-extra` — file operations (existing)
- `micromatch` — glob matching (existing)

### .prodroot Guard

Git commands classified as:
- **Read-only** (no guard): `status`, `fetch`
- **Destructive** (requires `.prodroot` in repo dir): `init`, `commit`, `push`, `pull`, `remote-add`

### Removed Files

- `sync_repo.js`, `git_all.js`, `install.js` — replaced by `bin/oceancode.js` + `src/commands/`
- `sync_repos.json` — replaced by `sync_repos.yaml` at workspace root
- `synclist.txt` — replaced by comma-delimited repo args
- `lib/batch.js` — batch logic absorbed into `src/commands/sync.js`
- `lib/` directory — moved to `src/lib/`

### Key Decisions

1. **Explicit paths over config** — `-s` and `-t` flags instead of storing paths in config. Makes config portable across machines.
2. **No synclist files** — comma-delimited repo names as positional args. Simpler, no extra files to manage.
3. **YAML over JSON** — cleaner for a repo map, easier to read/edit.
4. **Stay in scripts/** — don't move to `lib/cli/oceancode` yet. Future assignment will absorb build scripts too.
5. **.prodroot guard** — prevents accidental destructive git ops on dev repos.

## Success Criteria

1. `oceancode sync dev2prod -s ... -t ...` syncs all repos from yaml
2. `oceancode sync dev2prod oceanfarm,oceanquant -s ... -t ...` syncs specific repos
3. `oceancode sync dev2prod ... --mirror --force --dry-run` flags all work
4. `oceancode sync prod2dev` and `oceancode sync prune` work same pattern
5. `oceancode git init -t ...` initializes prod repos, blocked without `.prodroot`
6. `oceancode git commit "msg" -t ...` commits, blocked without `.prodroot`
7. `oceancode git status -t ...` works anywhere (no guard)
8. `oceancode install <base-url>` clones all repos from yaml
9. `npm link` makes `oceancode` available globally
10. Existing tests replaced with minimal new test suite

## Testing Approach

Minimal rewrite of tests using `node:test`. Focus on:
- Sync command: dev2prod round-trip, mirror mode, specific repos
- Git command: .prodroot guard enforcement
- No need for exhaustive edge case coverage
