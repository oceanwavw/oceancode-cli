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
- `src/commands/build.js` — per-module build runner; reads `oceancode.build.yaml` from each module, resolves platform-specific steps, executes sequentially
- `src/commands/launch.js` — app launcher with dev (venv/npm) and prod (binary) modes
- `src/commands/init.js` — interactive wizard to generate `oceancode.yaml`
- `src/lib/configLoader.js` — unified config loader (`loadConfig`, `requireSection`, `resolveRepos`) with path validation
- `src/lib/` — shared internals (dev2prod, prod2dev, prune, guards, shared, walker)
- `src/lib/defaults.js` — hardcoded registry of repos, launchers, tool install info
- `src/lib/configGen.js` — config generation functions with atomic writes
- `src/lib/build/` — build helpers (platform detection, tool checking/install prompting)
- `src/lib/buildLoader.js` — per-module `oceancode.build.yaml` loader with validation and platform step resolution

### Config
- Single `oceancode.yaml` at workspace root with sections: `workspace` (prod_root), `repos` (name→relative path), `build` (flat list of module names), `launchers`
- Dev root = cwd (enforced — no `dev_root` in config), prod root = `config.workspace.prod_root`
- Partial config supported: commands only require their relevant sections (e.g., `sync` needs `workspace.prod_root` + `repos`, `build` needs `build`)
- Repo paths must be relative to workspace root (absolute paths rejected by `resolveRepos`)
- No machine-specific paths in config; platform detection at runtime via `process.platform`

### Key Concepts
- **`.prodroot` guard** — destructive git ops (commit, push, pull, init, remote-add) require `.prodroot` marker file in target dir; read-only ops (status, fetch) work anywhere
- **`.prodinclude` allowlist** — dev repos declare which files to sync via glob patterns
- **Direction guards** — `validateDev2Prod`/`validateProd2Dev` ensure sync direction is correct via marker files
- **Repo filtering** — comma-delimited repo names inline (e.g., `oceanfarm,oceanquant`); default is all repos from config
- **Per-module builds** — each buildable module has an `oceancode.build.yaml` declaring `tools` (for preflight) and `steps` (flat list or platform-keyed `linux/macos/windows` object). `oceancode build` iterates active modules from config, loads their yaml, runs steps.
- **Preflight checks** — tool requirements aggregated from active modules' `oceancode.build.yaml`, with user-prompted auto-install
- **Launcher modes** — dev mode runs from source (venv Python or npm), prod mode runs compiled binaries
- **Interactive prompts** — all commands use `@clack/prompts` for interactive input when no args given and TTY; prompts are skipped when args are provided or stdin is not a TTY
- **Config wizard** — `oceancode init` generates config files interactively with YAML preview and confirm-before-write

## Conventions & Constraints
- Keep scripts simple and modular
- TDD with `node:test`, no external test framework
- Explicit paths via CLI flags, no hardcoded machine paths
- CommonJS (`require`), not ESM
