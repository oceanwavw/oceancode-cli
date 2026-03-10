# Scripts Maintenance Guide

This guide tells you which files need updating whenever a lib module is added, removed, or renamed.

## Canonical Module List

These are the current repositories managed by the scripts. When adding or removing a module, update every file listed in the next section.

### Core Libraries (`lib/`)
- jsonldb
- oceancap
- oceandata
- oceanfarm
- oceanquant
- oceanseed
- oceanshed
- oceanutil

### Back-ends (`lib/back_ends/`)
- oceanseed_app
- oceanfarm_app
- oceanhub_app

### Front-ends (`lib/front_ends/`)
- oceanwave_dash
- oceanreact

### Legacy Front-ends (`lib/front_ends/`)
- oceandata_gui
- oceanpyqt

### CLI Tools (`lib/cli/`)
- oceandata-cli
- oceanlab-cli

### Other
- scripts (this repo)
- configs

## Files to Update

When a module is added or removed, update **all** of the following files:

### In `/scripts/` (dev - synced to prod)

| File | What to update |
|------|---------------|
| `sync_to_prod.bat` | Add/remove the robocopy + copy block for the module. Update step counts (`[N/M]`) and the summary `echo` at the bottom. |
| `install.bat` | Add/remove the module from the appropriate `for %%r in (...)` loop and the summary section. |
| `git_clone_new.bat` | Add/remove the module from the appropriate `for %%r in (...)` loop. |
| `git_commit_all.bat` | Add/remove from the `REPOS` variable (single line, space-separated paths like `lib\modulename`). |
| `git_discard_all.bat` | Same as above - update the `REPOS` variable. |
| `git_fetch_all.bat` | Same as above - update the `REPOS` variable. |
| `git_pull_all.bat` | Same as above - update the `REPOS` variable. |
| `git_push_all.bat` | Same as above - update the `REPOS` variable. |
| `git_remote_add_all.bat` | Same as above - update the `REPOS` variable. |
| `git_status_all.bat` | Same as above - update the `REPOS` variable. |

### In `/` (prod root - `oceanwave_v1/`)

| File | What to update |
|------|---------------|
| `setup.bat` | Only clones `scripts`. No module list to update unless the bootstrap flow changes. |

## How Module Paths Map

Different scripts use different path formats for the same module:

| Module | REPOS variable path | Clone target |
|--------|-------------------|--------------|
| jsonldb | `lib\jsonldb` | `lib\jsonldb` |
| oceanseed_app | `lib\back_ends\oceanseed_app` | `lib\back_ends\oceanseed_app` |
| oceanwave_dash | `lib\front_ends\oceanwave_dash` | `lib\front_ends\oceanwave_dash` |
| oceandata-cli | `lib\cli\oceandata-cli` | `lib\cli\oceandata-cli` |
| configs | `configs` | `configs` |
| scripts | `scripts` | `scripts` |

## Checklist for Adding a New Module

1. Decide which category it belongs to (core lib, back-end, front-end, CLI, other).
2. Update the `REPOS` variable in all 7 `git_*_all.bat` scripts (commit, discard, fetch, pull, push, remote_add, status).
3. Add a clone block in `install.bat` under the correct `for` loop.
4. Add a clone block in `git_clone_new.bat` under the correct `for` loop.
5. Add a sync block in `sync_to_prod.bat` (robocopy for source folders, copy for config files). Update step numbering and summary.
6. Update this guide's canonical module list above.
