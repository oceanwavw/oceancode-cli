## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] `prod2dev` currently says "copy all prod files back to dev", which can leak `.prodroot` and any prod-only operational files into dev. Define explicit exclusions for `prod2dev` (at minimum `.prodroot`) and clarify whether hardcoded safety negations apply in both directions.
2. [F1.2] Path normalization rules are missing. Because this project runs on Windows and Unix shells, matching/deletelist logic must specify normalized relative paths (e.g., `/` separators, no `..`, no absolute paths) to avoid incorrect matches and unsafe deletes.
3. [F1.3] `prune` safety constraints are underspecified. Require that each delete-list entry resolves inside `--dev`, reject traversal/symlink escapes, and document behavior for missing files so `prune` cannot delete outside the repository by crafted input.
4. [F1.4] "Skip unchanged files (size/mtime)" is not reliable enough by itself for correctness-sensitive sync (same size + timestamp collisions are possible). Either strengthen to content hash for uncertain cases or explicitly document this as a performance tradeoff and provide an override mode.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** approved

### Findings
1. No blocking findings. The Round 1 issues are addressed with sufficient specificity for implementation.

### Addressed from changelog
- [F1.1] Confirmed. Safety negations are explicitly defined for both directions, and `prod2dev` excludes them before copy.
- [F1.2] Confirmed. Path normalization rules now define canonical relative path handling across matching and delete-list workflows.
- [F1.3] Confirmed. `prune` now specifies traversal/absolute/out-of-root rejection and skip-with-warning behavior for missing files.
- [F1.4] Confirmed. Size/mtime is now documented as a tradeoff, and `--force` exists as explicit full-resync override.
