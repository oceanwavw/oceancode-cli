# Design: sync_repo

## Overview

**sync_repo.js** is a Node.js CLI utility for bidirectional sync between a development repo and a production repo. The prod repo is a clean subset of dev — no dev artifacts, test fixtures, or tooling — suitable for pushing to a remote.

Architecture context: `dev 1 <-> prod 1 <-> remote repo <-> prod 2 <-> dev 2`

The tool replaces the hardcoded `sync_to_prod.bat` with a generic, config-driven approach using an allowlist file (`.prodinclude`).

## Goals

- Replace the hardcoded 21-step `sync_to_prod.bat` with a generic, config-driven tool
- Allowlist model (`.prodinclude`) so new dev artifacts are excluded by default
- Bidirectional: `dev2prod` (filtered push) and `prod2dev` (pull changes back)
- Safe deletion workflow via delete-list file + separate `prune` command
- Direction guards via marker files to prevent accidental wrong-way syncs
- `--dry-run` and `--verbose` for inspectability

## Non-Goals

- Not a git replacement — syncs files between local folders, doesn't interact with git remotes
- No interactive prompts during sync — all destructive actions go through the delete-list workflow
- No nested `.prodinclude` — single root-level file with glob wildcards is sufficient
- No `.prodignore` — negation patterns (`!`) inside `.prodinclude` handle exclusions
- No watch mode or continuous sync — manual run-when-needed tool
- No file transformation — copies files as-is, no minification/compilation/etc.

## Design

### Commands

```
node sync_repo.js dev2prod --dev <path> --prod <path> [--mirror] [--dry-run] [--verbose]
node sync_repo.js prod2dev --dev <path> --prod <path> [--dry-run] [--verbose]
node sync_repo.js prune --dev <path> --deletelist <file> [--dry-run]
```

### `.prodinclude` Format

Gitignore-style syntax, single file at dev root:

```
# Comments supported
src/**
lib/**
pyproject.toml
README.md

# Negations — exclude even if matched above
!src/**/*.test.*
!src/**/__fixtures__/
```

- Blank lines and `#` comment lines ignored
- Glob patterns matched via `micromatch`
- `!` prefix = negation (exclude even if a broader pattern matched)
- Matched against relative paths from repo root

### Hardcoded Safety Negations

Always excluded regardless of `.prodinclude` content. User cannot override:

```
.git/**
__pycache__/**
node_modules/**
.venv/**
.env
*.pyc
.DS_Store
.prodroot
.prod_deletes
```

### Marker Files

| File | Location | Purpose |
|------|----------|---------|
| `.prodinclude` | dev root | User-authored allowlist defining what ships to prod |
| `.prodroot` | prod root | Auto-created on first `dev2prod`, identifies prod folder |
| `.prod_deletes` | dev root | Auto-generated delete candidate list from `prod2dev` |

### Direction Guards

- `dev2prod`: `--dev` must have `.prodinclude`, `--prod` must have `.prodroot` or be empty/new
- `prod2dev`: `--prod` must have `.prodroot`, `--dev` must have `.prodinclude`
- Fail with corrective suggestion if reversed, e.g.: `Error: --dev path contains .prodroot — this looks like a prod folder. Did you mean prod2dev?`

### dev2prod Flow

1. Validate markers
2. Parse `.prodinclude` → include patterns + `!` negation patterns
3. Prepend hardcoded safety negations
4. Walk dev tree, match includes minus negations → plan copies
5. Skip unchanged files (size/mtime comparison)
6. If `--mirror`: walk prod, plan deletions for files not in planned set
7. If `--dry-run`: print plan, exit
8. Execute: mkdirs → copies → deletes
9. Create `.prodroot` if not present
10. Print summary

### prod2dev Flow

1. Validate markers
2. Walk prod tree, copy all to dev (skip unchanged)
3. Resolve full allowlisted set from `.prodinclude` in dev
4. Files in dev's allowlisted set missing from prod → write to `.prod_deletes`
5. Print summary, note delete candidates if any

### prune Flow

1. Read delete list (one path per line, `#` comments, blank lines ignored)
2. Delete listed files from dev
3. Remove empty parent dirs
4. Print summary

### Dependencies

- `micromatch` — glob pattern matching with negation support
- `fs-extra` — recursive copy, ensureDir, remove

### Output

Summary (always shown):
```
sync_repo dev2prod complete
  Copied:  42 files
  Skipped: 118 files (unchanged)
  Deleted: 3 files (mirror)
  Errors:  0
```

Verbose lists every action. Dry run prefixes with `WOULD`.

### Exit Codes

- `0` — success
- `1` — validation error (bad args, missing markers, missing `.prodinclude`)
- `2` — execution errors (copy/delete failures)

## Success Criteria

- `dev2prod` copies only `.prodinclude`-matched files, nothing else leaks through
- `dev2prod --mirror` removes stale files from prod
- `prod2dev` copies all prod files back to dev, emits accurate `.prod_deletes`
- `prune` deletes only files listed in the delete list
- Direction guards prevent wrong-way sync with clear error messages
- Hardcoded safety negations cannot be overridden by `.prodinclude`
- `--dry-run` produces accurate plan without writing anything
- Unchanged files are skipped (size/mtime check)
- Replaces `sync_to_prod.bat` for the oceanwave project when paired with a `.prodinclude`
