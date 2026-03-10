# Workflow Diff — sync_repo
**Date:** 2026-03-10  |  **Assignment:** 00001_feature_sync-repo

## What Worked
- Brainstorm phase was efficient since the design was pre-discussed with the user — section-by-section validation moved fast
- Codex reviewloop caught real issues: incomplete guard logic, stale file cleanup, non-existent path handling
- TDD via subagents was effective — each task produced tested, committed code independently
- Parallel subagent dispatch for independent tasks (dev2prod + prod2dev) saved time

## What Didn't
- WSL2 timestamp flakiness caused intermittent test failures — had to reduce mtime comparison precision to seconds. This is a platform-specific gotcha that should be documented
- The `prepare-task.sh` script's skill resolution failed on `[test-driven-development]` format (brackets in the Skills field) — skills were listed as `[test-driven-development]` instead of `test-driven-development`
- Codex reviewer needed 3 rounds to cover the non-existent prod path edge case fully (guard passed but mirror still broke) — related findings should ideally be caught together
- `progress.json` initialized as `{}` by `specdev implement` but `track-progress.sh` expected a different format — required manual reinit
