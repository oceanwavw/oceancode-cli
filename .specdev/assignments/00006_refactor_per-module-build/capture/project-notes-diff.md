# Project Notes Diff — Per-Module Build System
**Date:** 2026-03-11  |  **Assignment:** 00006_refactor_per-module-build

## Gaps Found
- big_picture.md describes the build system as "category-based" with backends/frontends/cli targets. This is now replaced by per-module `oceancode.build.yaml` files. The `build` section description, config description, and `src/lib/build/` file listing need updating.
- big_picture.md mentions `src/lib/defaults.js` as containing "build targets" — it no longer has pythonVenvTargets/frontendTargets/goTargets/preflightTools/pypiDeps.
- feature_descriptions.md entry for 00003 (Build Scripts Integration) references deleted files (backends.js, frontends.js, cli.js, buildConfig.js). Should note these were superseded by 00006.
- Config section says `build` contains "targets, venv, tools" — now it's a flat list of module names.

## No Changes Needed
- Sync system description is accurate
- Git operations description is accurate
- Launcher system description is accurate
- Tech stack and conventions are accurate
