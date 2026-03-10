# Workflow Diff — oceancode CLI
**Date:** 2026-03-10  |  **Assignment:** 00002_feature_oceancode-cli

## What Worked
- Iterative design discussion with user before brainstorm phase caught several simplifications early (removing --all flag, dropping synclist.txt support, making -s/-t explicit)
- Codex reviewloop caught a real parsing bug (F1.2/F2.1) that manual testing missed — unknown repo names silently fanning out to all repos
- Preserving existing lib signatures and just wrapping them in command modules kept the refactor safe
- TDD approach ensured existing sync logic didn't break during restructuring

## What Didn't
- Git repo-filter parsing required 3 iterations: (1) comma-only heuristic, (2) config-based name lookup, (3) EXPECTED_POSITIONALS map. The ambiguity between "is this a repo name or a commit message?" was underspecified in the design phase
- Progress tracking fell out of sync — tasks were implemented but progress.json wasn't updated, blocking phase approval. Should update progress after each task commit
- The plan included the old git.js code from before the F1.2 fix, so round 2 of reviewloop found the same bug again. Changelog should be more precise about what code changed
