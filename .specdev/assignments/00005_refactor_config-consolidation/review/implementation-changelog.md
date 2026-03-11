## Round 1

### F1.1 — Validate repo paths are workspace-relative
- **Fix**: Added absolute path validation in `resolveRepos()` (`src/lib/configLoader.js:38-42`). Before returning repos, the function iterates all entries and throws if any path is absolute (`path.isAbsolute()`).
- **Test**: Added `resolveRepos rejects absolute repo paths` test in `test/configLoader.test.js` confirming that `{ repos: { bad: '/absolute/path' } }` throws with `/absolute path/` message.
- **Result**: All 72 tests pass.
