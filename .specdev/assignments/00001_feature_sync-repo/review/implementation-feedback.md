## Round 1

**Verdict:** needs-changes

### Findings
1. [F1.1] **CRITICAL** `dev2prod` direction guard is incomplete versus design. The design requires `--prod` to either contain `.prodroot` or be empty/new, but `validateDev2Prod` currently only checks that `--prod` is not a dev folder (no `.prodinclude`) and does not block syncing into a non-empty unmarked directory. This can copy/mirror into the wrong target and cause destructive deletes. Evidence: `lib/guards.js` `validateDev2Prod` has no emptiness or `.prodroot` requirement check.
2. [F1.2] **MINOR** `prod2dev` can leave a stale `.prod_deletes` file from prior runs when there are zero current delete candidates. This makes the delete list inaccurate for the latest sync state and can mislead a subsequent `prune` run. Evidence: `lib/prod2dev.js` only writes `.prod_deletes` when `deleteCandidates.length > 0` and never clears/removes an existing file when the count is `0`.

### Addressed from changelog
- (none -- first round)

## Round 2

**Verdict:** needs-changes

### Findings
1. [F2.1] **CRITICAL** `dev2prod` does not accept a truly new `--prod` path that does not exist yet, which violates the design requirement "`--prod` must have `.prodroot` or be empty/new". In `validateDev2Prod`, the non-`.prodroot` path check always runs `fs.readdir(prodDir)`, which throws `ENOENT` for a missing directory instead of treating it as new. Repro: call `validateDev2Prod(devWithProdinclude, nonExistentProdDir)`; current result is `ENOENT: no such file or directory, scandir ...`. Expected: validation should pass for non-existent/new prod paths and allow `dev2prod` to create the target.

### Addressed from changelog
- [F1.2] Addressed: stale `.prod_deletes` cleanup is now implemented when there are zero delete candidates.
- [F1.1] Partially addressed: non-empty unmarked `--prod` directories are now rejected, but the "new path does not yet exist" case is still broken (see [F2.1]).

## Round 3

**Verdict:** needs-changes

### Findings
1. [F3.1] **CRITICAL** `dev2prod --mirror` still fails for a new/non-existent `--prod` path, despite [F2.1] guard changes. Validation now allows the path, but the mirror phase unconditionally runs `walkTree(prod, SAFETY_NEGATIONS)`, which throws `ENOENT` when `prod` does not exist yet. Repro: run `dev2prod({ dev, prod: <non-existent-path>, mirror: true })` with a valid `.prodinclude`; observed error: `ENOENT: no such file or directory, scandir ...`. Expected: treat missing prod dir as empty and continue (no deletions planned).

### Addressed from changelog
- [F2.1] Partially addressed: non-existent `--prod` paths now pass direction validation, but mirror mode still errors on the same scenario (see [F3.1]).
