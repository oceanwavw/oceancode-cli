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
- `src/commands/git-dev.js` — status only across dev repos
- `src/commands/git-prod.js` — full git ops (status, commit, push, pull, fetch, remote-add, init) with `.prodroot` guard and `.gitignore` seeding
- `src/commands/clone-prod.js` — clone repos from a git server base URL into prod root
- `src/commands/build.js` — cross-platform build dispatcher (backends, frontends, cli targets with granular package targeting)
- `src/commands/launch.js` — app launcher with dev (venv/npm) and prod (binary) modes
- `src/commands/init.js` — interactive wizard to generate `oceancode.yaml`
- `src/lib/configLoader.js` — unified config loader (`loadConfig`, `requireSection`, `resolveRepos`) with path validation
- `src/lib/` — shared internals (dev2prod, prod2dev, prune, guards, shared, walker)
- `src/lib/defaults.js` — hardcoded registry of repos, build targets, launchers, tool install info
- `src/lib/configGen.js` — config generation functions with atomic writes
- `src/lib/build/` — build system modules (platform, preflight, backends, frontends, cli)

### Config
- Single `oceancode.yaml` at workspace root with sections: `workspace` (prod_root), `repos` (name→relative path), `build` (targets, venv, tools), `launchers`
- Dev root = cwd (enforced — no `dev_root` in config), prod root = `config.workspace.prod_root`
- Partial config supported: commands only require their relevant sections (e.g., `sync` needs `workspace.prod_root` + `repos`, `build` needs `build`)
- Repo paths must be relative to workspace root (absolute paths rejected by `resolveRepos`)
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
