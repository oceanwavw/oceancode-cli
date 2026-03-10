## Round 1

- [F1.1] Not a bug — `sync_repos.yaml` exists at workspace root (`/mnt/h/oceanwave/sync_repos.yaml`). Reviewer looked inside `scripts/` which is the CLI package, not the workspace root. Config resolution uses cwd by design.
- [F1.2] Fixed — removed comma-only repo detection heuristic in git parseArgs. Now first positional is checked against config repo names (single or comma-delimited). Unknown names fall through as action args (commit message, remote name).
- [F1.3] Fixed — updated `.prod_deletes` guidance in `src/lib/prod2dev.js` from `node sync_repo.js prune ...` to `oceancode sync prune ...`.

## Round 2

- [F2.1] Fixed — replaced config-based repo detection with `EXPECTED_POSITIONALS` map. Each action declares how many positional args it consumes (e.g. status=0, commit=1, push=1, remote-add=2). If there are more positionals than expected, the first is treated as a repo filter and passed to `resolveRepos`, which throws on unknown names. This eliminates silent fan-out for unknown repo selectors.
