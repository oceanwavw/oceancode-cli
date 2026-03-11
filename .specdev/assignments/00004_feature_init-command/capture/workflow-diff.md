# Workflow Diff — Init Command + Interactive Prompts
**Date:** 2026-03-11  |  **Assignment:** 00004_feature_init-command

## What Worked
- Brainstorm phase produced a clear design with wizard flow, integration pattern, and success criteria
- Hardcoded defaults approach (vs auto-discovery) simplified implementation significantly
- TDD approach caught the sync_repos.yaml schema mismatch early (object map vs array)
- Changelog-based review loop effectively tracked addressed vs unresolved findings

## What Didn't
- Codex reviewer sandbox produces persistent false positives on `execSync` calls (EPERM), consuming all 3 review rounds on a non-issue. Need a way to mark known false positives so the reviewer skips them.
- The 3-round limit means a real critical finding + a sandbox false positive can exhaust the review budget without resolution
- Assignment scope creep: started as "init command" but grew to include interactive prompts for all 6 commands, which increased implementation complexity significantly
