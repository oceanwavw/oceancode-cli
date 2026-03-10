'use strict';

const path = require('path');
const fs = require('fs-extra');
const { normalizePath } = require('./shared');

async function prune(flags) {
  const { dev, deletelist, dryRun } = flags;

  if (!(await fs.pathExists(deletelist))) {
    console.error(`Delete list not found: ${deletelist}`);
    return 1;
  }

  const content = await fs.readFile(deletelist, 'utf8');
  const lines = content.split(/\r?\n/);

  let deleted = 0;
  let skippedMissing = 0;
  let rejected = 0;
  const dirsToCheck = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = normalizePath(line);

    if (path.isAbsolute(normalized) || normalized.startsWith('/')) {
      console.error(`  REJECTED (absolute path): ${line}`);
      rejected++;
      continue;
    }

    if (normalized.includes('..')) {
      console.error(`  REJECTED (path traversal): ${line}`);
      rejected++;
      continue;
    }

    // Resolve and check it stays within dev (including symlink escape)
    const resolved = path.resolve(dev, normalized);
    let realResolved;
    try {
      realResolved = await fs.realpath(resolved);
    } catch {
      realResolved = resolved;
    }
    const realDev = await fs.realpath(dev);
    if (!realResolved.startsWith(realDev + path.sep) && realResolved !== realDev) {
      console.error(`  REJECTED (escapes dev root): ${line}`);
      rejected++;
      continue;
    }

    if (!(await fs.pathExists(resolved))) {
      console.warn(`  WARN (not found): ${normalized}`);
      skippedMissing++;
      continue;
    }

    if (dryRun) {
      console.log(`  WOULD DELETE ${normalized}`);
    } else {
      await fs.remove(resolved);
      deleted++;
    }

    const parentDir = path.dirname(resolved);
    if (parentDir !== dev) {
      dirsToCheck.add(parentDir);
    }
  }

  if (!dryRun) {
    const sortedDirs = [...dirsToCheck].sort((a, b) => b.length - a.length);
    for (const dir of sortedDirs) {
      const dirNorm = path.normalize(dir);
      const devNorm = path.normalize(dev);
      if (!dirNorm.startsWith(devNorm + path.sep)) continue;
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
        }
      } catch {
        // dir may already be removed
      }
    }
  }

  console.log(`\nsync_repo prune complete`);
  console.log(`  Deleted:  ${deleted}`);
  console.log(`  Missing:  ${skippedMissing}`);
  console.log(`  Rejected: ${rejected}`);

  return 0;
}

module.exports = { prune };
