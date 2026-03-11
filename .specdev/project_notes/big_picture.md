# Project Big Picture

## Overview
`oceancode` — a unified CLI for the OceanWave multi-repo workspace. Manages repo syncing (dev↔prod), git operations across repos, repo cloning, cross-platform builds (backends/frontends/CLI tools), and app launching (dev/prod modes).

## Users / Consumers
Developers on the team. CLI is installed globally via `npm link` from the `scripts/` directory.

## Tech Stack
- Node.js (CommonJS) — all CLI logic
- Dependencies: `fs-extra`, `js-yaml`, `micromatch`, `@clack/prompts`
- Testing: `node:test` (built-in, no external framework)

## Architecture

### CLI Structure
- `bin/oceancode.js` — entry point/dispatcher, routes to command modules by first arg
- `src/commands/sync.js` — dev2prod, prod2dev, prune (wraps lib functions)
- `src/commands/git.js` — status, commit, push, pull, fetch, remote-add, init
- `src/commands/install.js` — clone repos from a git server base URL
- `src/commands/build.js` — cross-platform build dispatcher (backends, frontends, cli targets with granular package targeting)
- `src/commands/launch.js` — app launcher with dev (venv/npm) and prod (binary) modes
- `src/commands/init.js` — interactive wizard to generate `sync_repos.yaml` and `build.yaml` configs
- `src/lib/` — shared internals (config, dev2prod, prod2dev, prune, guards, shared, walker)
- `src/lib/defaults.js` — hardcoded registry of repos, build targets, launchers, tool install info
- `src/lib/configGen.js` — config generation functions with atomic writes
- `src/lib/build/` — build system modules (platform, buildConfig, preflight, backends, frontends, cli)

### Config
- `sync_repos.yaml` at workspace root — repo map only (name → relative path)
- `build.yaml` at workspace root — build targets, venv configs, tool install info, launcher definitions
- No machine-specific paths in config; platform detection at runtime via `process.platform`

### Key Concepts
- **`.prodroot` guard** — destructive git ops (commit, push, pull, init, remote-add) require `.prodroot` marker file in target dir; read-only ops (status, fetch) work anywhere
- **`.prodinclude` allowlist** — dev repos declare which files to sync via glob patterns
- **Direction guards** — `validateDev2Prod`/`validateProd2Dev` ensure sync direction is correct via marker files
- **Repo filtering** — comma-delimited repo names inline (e.g., `oceanfarm,oceanquant`); default is all repos from config
- **Cross-platform builds** — single Node.js commands replace platform-specific shell/batch scripts; `build.yaml` declares all targets with 3-key platform scheme (`linux/macos/windows`)
- **Preflight checks** — tool detection with user-prompted auto-install before builds
- **Launcher modes** — dev mode runs from source (venv Python or npm), prod mode runs compiled binaries
- **Interactive prompts** — all commands use `@clack/prompts` for interactive input when no args given and TTY; prompts are skipped when args are provided or stdin is not a TTY
- **Config wizard** — `oceancode init` generates config files interactively with YAML preview and confirm-before-write

## Conventions & Constraints
- Keep scripts simple and modular
- TDD with `node:test`, no external test framework
- Explicit paths via CLI flags, no hardcoded machine paths
- CommonJS (`require`), not ESM
