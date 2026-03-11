## Round 2 Changes

- [F2.1] Added explicit validation for `build` list entries in `oceancode.yaml`: each must be a non-empty string, duplicates rejected with deterministic error message. Added as step 2 in the build flow, before module resolution.

## Round 1 Changes

- [F1.1] Added explicit validation rules for `oceancode.build.yaml` schema: `tools` must be array, `steps` required and must be array or object, empty strings rejected, unknown keys warn. All validation is fail-fast before any builds run.
- [F1.2] Added fail-fast validation for module resolution: modules in `build` must exist in `repos`, repo directories must exist. Clear error messages for each case.
- [F1.3] Clarified `oceancode build <module-name>` semantics: the `build` list acts as an allowlist. Module must be in the list or error with guidance to add it.
- [F1.4] Specified error handling policy: failed step stops that module immediately, logs command and exit code, continues to next module. Summary at end with exit code 1 if any failed. Output streams via `stdio: 'inherit'`.
