## Round 1 Changes

- [F1.1] Init wizard now reads each module's `oceancode.build.yaml` and shows tool requirements as hints (e.g. `tools: node, npm`) instead of repo paths.
- [F1.2] Removed obsolete `getRequiredTools` and `runPreflight` functions from `preflight.js`. Only `checkTool` and `promptInstall` remain (still used by new build runner).
- [F1.3] Wrapped `validateBuildList()` call in `build.js` with try/catch to produce user-friendly CLI error messages instead of uncaught stack traces.
