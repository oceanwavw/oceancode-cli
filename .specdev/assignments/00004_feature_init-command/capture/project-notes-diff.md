# Project Notes Diff — Init Command + Interactive Prompts
**Date:** 2026-03-11  |  **Assignment:** 00004_feature_init-command

## Gaps Found
- big_picture.md is missing `@clack/prompts` in the dependency list — now a production dependency
- big_picture.md doesn't mention `src/lib/defaults.js` (hardcoded registry) or `src/lib/configGen.js` (config generators) as shared internals
- big_picture.md doesn't document interactive prompt behavior pattern (TTY guard, prompt-skip when args given)
- big_picture.md should note that `oceancode init` exists as a config wizard command
- Config section should mention that configs can be generated interactively via `oceancode init`, not just manually authored

## No Changes Needed
- CLI Structure section already lists the command modules correctly (init just needs to be added)
- Key Concepts section is still accurate
- Conventions & Constraints section is still accurate
