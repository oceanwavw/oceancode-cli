# Project Big Picture

## Overview
`oceancode` — a unified CLI for the OceanWave multi-repo workspace. Manages repo syncing (dev↔prod), git operations across repos, and repo cloning from git servers.

## Users / Consumers
Developers on the team. CLI is installed globally via `npm link` from the `scripts/` directory.

## Tech Stack
- Node.js (CommonJS) — all CLI logic
- Dependencies: `fs-extra`, `js-yaml`, `micromatch`
- Testing: `node:test` (built-in, no external framework)
- Shell scripts in `build/` and `launchers/` for legacy build automation (not yet absorbed into CLI)

## Architecture

### CLI Structure
- `bin/oceancode.js` — entry point/dispatcher, routes to command modules by first arg
- `src/commands/sync.js` — dev2prod, prod2dev, prune (wraps lib functions)
- `src/commands/git.js` — status, commit, push, pull, fetch, remote-add, init
- `src/commands/install.js` — clone repos from a git server base URL
- `src/lib/` — shared internals (config, dev2prod, prod2dev, prune, guards, shared, walker)

### Config
- `sync_repos.yaml` at workspace root (`/mnt/h/oceanwave/sync_repos.yaml`) — repo map only (name → relative path)
- No machine-specific paths in config; `-s`/`-t` flags provide dev/prod base paths at runtime

### Key Concepts
- **`.prodroot` guard** — destructive git ops (commit, push, pull, init, remote-add) require `.prodroot` marker file in target dir; read-only ops (status, fetch) work anywhere
- **`.prodinclude` allowlist** — dev repos declare which files to sync via glob patterns
- **Direction guards** — `validateDev2Prod`/`validateProd2Dev` ensure sync direction is correct via marker files
- **Repo filtering** — comma-delimited repo names inline (e.g., `oceanfarm,oceanquant`); default is all repos from config

## Conventions & Constraints
- Keep scripts simple and modular
- TDD with `node:test`, no external test framework
- Explicit paths via CLI flags, no hardcoded machine paths
- CommonJS (`require`), not ESM
