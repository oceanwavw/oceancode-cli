# WSL2 Timestamp Precision

When comparing file modification times on WSL2, `fs.copy({ preserveTimestamps: true })` can lose sub-millisecond precision. Use second-level comparison (`Math.floor(mtimeMs / 1000)`) instead of raw millisecond comparison for reliable skip-unchanged logic.

Observed in: 00001_feature_sync-repo (`lib/shared.js:shouldSkipFile`)
