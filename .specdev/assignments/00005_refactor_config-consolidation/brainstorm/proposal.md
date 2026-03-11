# Proposal — Config Consolidation & Command Renames

Consolidate `sync_repos.yaml` and `build.yaml` into a single `oceancode.yaml` at the dev workspace root. Rename and split commands to make dev vs prod explicit: `install` → `clone-prod`, `git` → `git-dev` (status only) + `git-prod` (full ops). Enforce that `oceancode` must be run from the dev root (cwd = dev root, no hardcoded `__dirname` paths). Prod is source-only — no `build-prod` or `launch-prod`. `git-prod init` seeds a `.gitignore` to exclude build artifacts.
