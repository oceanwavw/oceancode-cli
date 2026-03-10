## Round 1

- [F1.1] Fixed: `validateDev2Prod` now checks that `--prod` is either empty or contains `.prodroot`. Non-empty unmarked directories are rejected with a clear error. Added test case.
- [F1.2] Fixed: `prod2dev` now removes stale `.prod_deletes` when there are zero delete candidates, preventing misleading leftover files from prior runs.

## Round 2

- [F2.1] Fixed: `validateDev2Prod` now checks `fs.pathExists(prodDir)` before `fs.readdir`, allowing non-existent (new) prod paths. Added test case for this scenario. Also stabilized `shouldSkipFile` mtime comparison to second-level precision for WSL2 compatibility.

## Round 3

- [F3.1] Fixed: `dev2prod` mirror mode now checks `fs.pathExists(prod)` before walking the prod tree, treating a non-existent dir as empty (no deletions). Also added `fs.ensureDir(prod)` before writing `.prodroot`. Added test for non-existent prod path with mirror flag.
