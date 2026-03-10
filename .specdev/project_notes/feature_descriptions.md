# Feature Descriptions

Running catalog of completed assignments. See `.specdev/_guides/task/validation_guide.md` (Gate 5) for update instructions.

---

## Features

### sync_repo
- **Assignment:** 00001_feature_sync-repo
- **Completed:** 2026-03-10
- **Description:** Bidirectional dev/prod repo sync CLI using allowlist model (`.prodinclude`). Three commands: `dev2prod` (filtered push), `prod2dev` (reverse sync with delete candidates), `prune` (apply reviewed delete list). Direction guards via marker files, hardcoded safety negations, path traversal protection.
- **Key files:** `sync_repo.js`, `lib/dev2prod.js`, `lib/prod2dev.js`, `lib/prune.js`, `lib/shared.js`, `lib/walker.js`, `lib/guards.js`

---

## Architecture & Structure

*(Updated by refactor assignments)*

---

## System Documentation

*(Updated by familiarization assignments)*
