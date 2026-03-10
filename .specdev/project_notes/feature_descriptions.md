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

---

## Architecture & Structure

*(Updated by refactor assignments)*

---

## System Documentation

*(Updated by familiarization assignments)*
