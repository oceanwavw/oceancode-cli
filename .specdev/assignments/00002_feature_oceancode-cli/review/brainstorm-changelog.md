## Round 1

- [F1.1] Added "Error Handling" section to design — explicit validation and exit behavior for all invalid input cases (unknown commands, missing flags, unknown repos, malformed config)
- [F1.2] Added "Config Resolution" section — `--config` flag then cwd, no discovery. Clear error on not found.
- [F1.3] Added `js-yaml` to Dependencies section. Config validation: check `repos` key exists, parse failure shows YAML error message.
- [F1.4] Declined — test scope stays minimal per user direction. Guard enforcement and sync round-trip covered. Cross-platform path normalization already tested in previous assignment.

## Round 2

- [F2.1] Removed machine-specific absolute path from config section. Now says "resolved via `--config` flag or `./sync_repos.yaml` in cwd" — consistent with Config Resolution section.
- [F2.2] Narrowed Goal 6 from "Cross-platform" to "Works on WSL2, Linux, and macOS (no platform-specific code, but no targeted cross-platform test suite)" — honest about test coverage.
