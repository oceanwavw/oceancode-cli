# Workflow Diff — Config Consolidation & Command Renames
**Date:** 2026-03-11  |  **Assignment:** 00005_refactor_config-consolidation

## What Worked
- 8-task sequential plan was well-ordered — config loader first, then commands, then cleanup
- TDD approach caught regressions early (deleting `git.js` before its test was cleaned up surfaced immediately)
- Codex reviewer caught the absolute path validation gap (F1.1) which was a real security concern
- Interactive design discussion with user before brainstorm produced a clear, unambiguous spec

## What Didn't
- Codex reviewer sandbox EPERM on `execSync({shell:true})` is a recurring false positive — documented but still causes noise
- Edit tool collisions when multiple edits target the same file in sequence can produce duplicate code blocks — Write tool is safer for full rewrites
- `specdev implement` initialized `progress.json` as `{}` which broke `track-progress.sh` — had to manually write proper JSON structure
