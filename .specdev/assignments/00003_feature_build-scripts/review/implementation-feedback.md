## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1][CRITICAL] `checkTool()` is functionally broken and causes false missing-tool failures in preflight. In [`src/lib/build/preflight.js:9`](/mnt/h/oceanwave/scripts/src/lib/build/preflight.js:9), it builds a string command like `which node` / `where node` and passes it to `execSync()` without `shell: true`; Node treats that as a single executable name (with a space), so lookup fails even when the tool exists. Repro: `checkTool('node')` currently returns `false` in this workspace. This blocks `oceancode build` by triggering unnecessary install prompts and can fail preflight entirely.
2. [F1.2][MINOR] Launcher venv resolution is not fully config-driven and does not align with the explicit `venv` mapping in `build.yaml`. In [`src/commands/launch.js:81`](/mnt/h/oceanwave/scripts/src/commands/launch.js:81), it looks up `config.venv[app]` (e.g., `oceandata`), but the config keys are package names (e.g., `oceandata_gui`). That misses valid config and silently falls back to hardcoded defaults at [`src/commands/launch.js:86`](/mnt/h/oceanwave/scripts/src/commands/launch.js:86). This works with current defaults but will break if non-default venv dirs are configured.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1][CRITICAL] [F1.1] is still not reliably fixed. `checkTool()` at [`src/lib/build/preflight.js:10`](/mnt/h/oceanwave/scripts/src/lib/build/preflight.js:10) continues to report false negatives for installed tools in this workspace (`checkTool('node') === false`), and `node --test test/preflight.test.js` fails on the assertion that Node should be detected. Current implementation remains too brittle for preflight gating.
2. [F2.2][CRITICAL] Auto-install execution is broken for command strings. In [`src/lib/build/preflight.js:57`](/mnt/h/oceanwave/scripts/src/lib/build/preflight.js:57), `execSync(autoCmd, { stdio: 'inherit' })` runs without a shell, but `build.yaml` auto-install entries include shell syntax (pipes/flags), e.g. `curl ... | sh` and `winget ...`. These commands are not executed correctly as-is, so prompted auto-install can fail systematically.
3. [F2.3][CRITICAL] Windows `build_script` invocation will fail for backend packages. In [`src/lib/build/backends.js:69`](/mnt/h/oceanwave/scripts/src/lib/build/backends.js:69), [`src/lib/build/backends.js:109`](/mnt/h/oceanwave/scripts/src/lib/build/backends.js:109), and [`src/lib/build/backends.js:121`](/mnt/h/oceanwave/scripts/src/lib/build/backends.js:121), scripts are launched as `call "..."` via `execSync` without `shell: true`. `call` is a `cmd.exe` builtin, so this does not work when executed directly.

### Addressed from changelog
- [F1.2] resolved: `launch.js` now finds venv config entries by `dev.venv_path`, so configured venv dirs are used instead of always falling back.
- [F1.1] attempted but not complete: adding `shell: true` changed behavior, but preflight tool detection still fails in this environment and is not robust enough for approval.

## Round 3

**Verdict:** needs-changes

### Findings
1. [F3.1][CRITICAL] [F2.1] remains unresolved: preflight tool detection still reports installed tools as missing in this workspace, and the test suite still fails on that behavior. Evidence:
   - `npm test` fails at `test/preflight.test.js`.
   - Direct repro: `node -e "const {checkTool}=require('./src/lib/build/preflight'); console.log(checkTool('node'))"` prints `false`.
   - In [`src/lib/build/preflight.js:10`](/mnt/h/oceanwave/scripts/src/lib/build/preflight.js:10), `checkTool()` still depends on `execSync(...)` command-string execution. In this environment, `execSync` throws `EPERM` even when `which node` exits successfully, so `checkTool()` incorrectly returns `false` and blocks preflight.

### Addressed from changelog
- [F2.2] Partially addressed in code shape (`shell: true` added), but not sufficient to approve while [F3.1] blocks preflight correctness.
- [F2.3] Code updated (`runCmd` now uses `shell: true`), but full Windows validation is still unverified in this review session.
