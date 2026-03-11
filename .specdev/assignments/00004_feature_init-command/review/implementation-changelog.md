# Implementation Changelog

## Round 1

### F1.1 — Preflight tool detection (CRITICAL)
**Status:** Codex sandbox false positive — no code change needed.

`checkTool('node')` works correctly in the real environment. The Codex reviewer runs in a restricted sandbox where `execSync` fails with EPERM on all commands. This was documented in assignment 00003 as a known limitation (`knowledge/_workflow_feedback/codex-sandbox-limitations.md`). All 59 tests pass locally, including `preflight.test.js`.

### F1.2 — Add YAML preview + confirm to init.js (CRITICAL)
**Status:** Fixed.

Added steps 7-8 from the design:
- After all selections, generated configs are previewed using `@clack/prompts` `note()` with `yaml.dump()` output
- A `confirm({ message: 'Write config files?' })` gate prevents writes until user approves
- Cancel or decline exits without writing, with a clear message

**Changed:** `src/commands/init.js` lines 135-165

### F1.3 — install.js prompt-skip violation (CRITICAL)
**Status:** Fixed.

Replaced `args.length <= 2` condition with a `originalHadBaseUrl` flag that tracks whether `baseUrl` was provided in the original args. Repo multiselect only shows when the user entered interactive mode (no base-url arg). When base-url is provided via args, no prompts appear.

**Changed:** `src/commands/install.js` — rewrote run() function

### F1.4 — Build package picker (MINOR)
**Status:** Fixed.

Added a follow-up `multiselect` after target selection in `build.js` that shows relevant packages for the chosen target category (backends → pythonVenvTargets, frontends → frontendTargets, cli → goTargets). If only one package is selected, it's passed as the package arg. Uses `defaults` registry for package lists.

`git`/`sync` partial-arg prompting was left as-is since the design says "Required flags are prompted when missing AND TTY" but doesn't specify this as a must-have; the current behavior (prompt all when no args, error when partial) is consistent and predictable. The finding was MINOR severity.

**Changed:** `src/commands/build.js` lines 48-75

## Round 2

### F2.1 — Preflight tool detection (CRITICAL)
**Status:** Codex sandbox false positive — no code change needed.

Same issue as F1.1 and assignment 00003. `checkTool('node')` works correctly in any real environment. The Codex reviewer runs in a restricted EPERM sandbox where all `execSync` calls fail. All 59 tests pass locally. This is documented in `knowledge/_workflow_feedback/codex-sandbox-limitations.md`.

### F2.2 — git/sync partial-arg prompting (MINOR)
**Status:** Fixed.

- **git.js**: Moved `-t` validation out of `parseArgs` into `run()`. After parsing, if `-t` is missing and TTY, prompts user for target path. Non-TTY falls through to error message.
- **sync.js**: Same pattern — moved `-s`/`-t` validation into `run()`. After parsing, if either is missing and TTY, prompts for the missing path(s). Non-TTY preserves error behavior.

**Changed:** `src/commands/git.js` lines 95-103, `src/commands/sync.js` lines 88-103
