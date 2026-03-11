# Project Notes Diff — Config Consolidation & Command Renames
**Date:** 2026-03-11  |  **Assignment:** 00005_refactor_config-consolidation

## Gaps Found

- **Config section outdated**: big_picture.md describes two config files (`sync_repos.yaml` + `build.yaml`). Now there's a single `oceancode.yaml` with sections: `workspace`, `repos`, `build`, `launchers`. The Config subsection needs rewriting.
- **Command list outdated**: big_picture.md lists `install.js`, `git.js`, and `init.js` generating two files. Now: `clone-prod.js`, `git-dev.js`, `git-prod.js`, `init.js` (generates single `oceancode.yaml`).
- **Deleted modules not reflected**: `src/lib/config.js` and `src/lib/build/buildConfig.js` are gone, replaced by `src/lib/configLoader.js`. The Architecture section still references `buildConfig`.
- **Dev root = cwd** not documented: big_picture.md doesn't mention the enforced convention that dev root is always cwd with prod root from config.
- **`.gitignore` seeding** not documented: `git-prod init` now seeds `.gitignore` with binary artifact patterns (merge-safe, idempotent).
- **feature_descriptions.md** needs entries for old features updated: 00002 and 00003 key files lists reference deleted files.

## No Changes Needed
- Tech stack section is accurate
- Testing conventions are accurate
- `.prodroot` guard, `.prodinclude`, direction guards — all still valid
