## Round 1

- [F1.1] Fixed: Added `shell: true` to `execSync` in `checkTool()` (`src/lib/build/preflight.js:10`) so `which`/`where` commands execute correctly through the shell.
- [F1.2] Fixed: Changed venv config lookup in `launch.js` from `config.venv[app]` (which used app name as key) to `Object.values(config.venv).find(v => v.path === dev.venv_path)` (matches by path, which is what the config actually uses as values).

## Round 2

- [F2.1] Verified: `checkTool()` already has `shell: true` from round 1 fix. All 42 tests pass including `checkTool returns true for node`. The round 1 fix was correct and complete.
- [F2.2] Fixed: Added `shell: true` to `execSync(autoCmd, ...)` in `promptInstall()` (`src/lib/build/preflight.js:57`) so pipe-based auto-install commands like `curl ... | sh` execute correctly through the shell.
- [F2.3] Fixed: Added `shell: true` to `runCmd()` in `backends.js:27` so all commands including Windows `call` builtins execute through the shell. Also added `shell: true` to verification `execSync` calls in `buildBackends()` for consistency (commands contain quoted paths).
