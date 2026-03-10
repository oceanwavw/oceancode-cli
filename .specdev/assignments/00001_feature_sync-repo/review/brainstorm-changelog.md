## Round 1

- [F1.1] Fixed: Hardcoded safety negations now explicitly apply in both directions. `prod2dev` flow updated to exclude safety-negated files (e.g. `.prodroot`) before copying to dev.
- [F1.2] Fixed: Added "Path Normalization" section to design. All paths normalized to `/` separators, no `..`, no absolute paths. Windows backslashes converted before matching.
- [F1.3] Fixed: `prune` flow now validates each entry — rejects `..` traversal, absolute paths, and symlink escapes outside `--dev`. Missing files are skipped with a warning.
- [F1.4] Fixed: Size/mtime is documented as the default performance tradeoff. Added `--force` flag to both `dev2prod` and `prod2dev` to bypass skip logic and force full resync.
