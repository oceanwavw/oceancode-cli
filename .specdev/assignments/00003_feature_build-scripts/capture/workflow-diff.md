# Workflow Diff — Build Scripts Integration
**Date:** 2026-03-10  |  **Assignment:** 00003_feature_build-scripts

## What Worked
- Interactive brainstorm Q&A with user narrowed scope effectively (dev/prod modes, no Rust fallback, maturin only, etc.)
- 7-task breakdown plan was well-scoped — each task was completable in a single pass
- TDD approach caught issues early (preflight tests immediately validated checkTool behavior)
- Codex reviewer caught real bugs: missing `shell: true` on execSync (F1.1), wrong venv lookup key (F1.2), missing `shell: true` on auto-install (F2.2), Windows `call` builtin needing shell (F2.3)

## What Didn't
- Codex reviewer in sandbox environment reports false positives for `execSync`-based tool detection — `EPERM` in sandbox makes `checkTool('node')` return false, flagging it as a bug across 3 rounds even though it works correctly in the real environment. This consumed all 3 review rounds on the same non-issue.
- Suggestion: reviewers running in restricted sandboxes should skip tests that require shell execution or note environment limitations in their findings
- The initial `shell: true` omission was a systematic pattern across multiple execSync calls — could have been caught by a linting rule or code convention doc
