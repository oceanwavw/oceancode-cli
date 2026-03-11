# Proposal: Integrate Build Scripts into oceancode CLI

Rewrite the 8 platform-specific shell/batch scripts in `build/` and `launchers/` as cross-platform Node.js command modules inside the `oceancode` CLI. This adds two new command groups — `build` and `launch` — driven by a new `build.yaml` config at the workspace root. The existing shell and batch files are deleted once the Node.js versions are verified.

**Why:** The current dual .sh/.bat approach duplicates logic across platforms, is hard to maintain, and lives outside the CLI that already manages sync/git/install. Consolidating into Node.js gives one codebase, one config, and consistent UX across Linux, macOS, and Windows.
