# Feature Descriptions

Running catalog of completed assignments. See `.specdev/_guides/task/validation_guide.md` (Gate 5) for update instructions.

---

## Features

### sync_repo
- **Assignment:** 00001_feature_sync-repo
- **Completed:** 2026-03-10
- **Description:** Bidirectional dev/prod repo sync CLI using allowlist model (`.prodinclude`). Three commands: `dev2prod` (filtered push), `prod2dev` (reverse sync with delete candidates), `prune` (apply reviewed delete list). Direction guards via marker files, hardcoded safety negations, path traversal protection.
- **Key files:** `src/lib/dev2prod.js`, `src/lib/prod2dev.js`, `src/lib/prune.js`, `src/lib/shared.js`, `src/lib/walker.js`, `src/lib/guards.js`

### oceancode CLI
- **Assignment:** 00002_feature_oceancode-cli
- **Completed:** 2026-03-10
- **Description:** Unified CLI replacing standalone scripts. Dispatcher pattern (`bin/oceancode.js`) routes to `sync`, `git`, `install` command modules. YAML config (`sync_repos.yaml`) at workspace root for repo map. `.prodroot` guard prevents destructive git ops on non-prod directories. Repo filtering via comma-delimited names.
- **Key files:** `bin/oceancode.js`, `src/commands/sync.js`, `src/commands/git.js`, `src/commands/install.js`, `src/lib/config.js`, `package.json`

### Build Scripts Integration
- **Assignment:** 00003_feature_build-scripts
- **Completed:** 2026-03-10
- **Description:** Replaced 8 shell/batch build scripts and 4 launcher scripts with Node.js modules. Cross-platform build system with `build.yaml` config, preflight tool checks with user-prompted install, granular build targeting (`oceancode build backends oceanquant`), and app launcher with dev/prod modes (`oceancode launch`).
- **Key files:** `src/commands/build.js`, `src/commands/launch.js`, `src/lib/build/platform.js`, `src/lib/build/buildConfig.js`, `src/lib/build/preflight.js`, `src/lib/build/backends.js`, `src/lib/build/frontends.js`, `src/lib/build/cli.js`, `build.yaml`

### Init Command + Interactive Prompts
- **Assignment:** 00004_feature_init-command
- **Completed:** 2026-03-11
- **Description:** Interactive config wizard (`oceancode init`) using `@clack/prompts` to generate `sync_repos.yaml` and `build.yaml` from hardcoded defaults with multi-select, preview, and confirm steps. Added interactive prompts to all 6 commands (init, install, git, build, sync, launch) with TTY guard and prompt-skip when args provided.
- **Key files:** `src/commands/init.js`, `src/lib/defaults.js`, `src/lib/configGen.js`, `src/commands/install.js`, `src/commands/git.js`, `src/commands/build.js`, `src/commands/sync.js`, `src/commands/launch.js`

---

## Architecture & Structure

*(Updated by refactor assignments)*

---

## System Documentation

*(Updated by familiarization assignments)*
