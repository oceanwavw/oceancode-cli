# Project Notes Diff — oceancode CLI
**Date:** 2026-03-10  |  **Assignment:** 00002_feature_oceancode-cli

## Gaps Found
- Big picture still describes "standalone shell scripts at root" and "sync_repo.js" — these are now replaced by the unified `oceancode` CLI with dispatcher pattern
- Tech stack should mention `js-yaml` (YAML config) and drop reference to shell scripts for git/build automation (git is now in the CLI)
- Architecture section needs to describe the new structure: `bin/oceancode.js` dispatcher → `src/commands/{sync,git,install}.js` → `src/lib/` internals
- Config is now `sync_repos.yaml` (YAML, repo map only) at workspace root, not JSON
- `.prodroot` guard concept is not documented anywhere in project notes
- `install` command (clone repos from git server) is not mentioned

## No Changes Needed
- Dev/prod sync workflow description (prodinclude allowlist, bidirectional sync) is still accurate
- TDD with `node:test` convention is correct
