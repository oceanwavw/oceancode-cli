'use strict';

const path = require('path');
const fs = require('fs-extra');
const { parseProdinclude, isFileMatch, shouldSkipFile, SAFETY_NEGATIONS } = require('./shared');
const { walkTree } = require('./walker');
const { validateDev2Prod } = require('./guards');

async function dev2prod(flags) {
  const { dev, prod, mirror, force, dryRun, verbose } = flags;

  await validateDev2Prod(dev, prod);
  const { includes, negations } = await parseProdinclude(dev);

  const devFiles = await walkTree(dev, SAFETY_NEGATIONS);

  const toCopy = [];
  let skipped = 0;

  for (const relPath of devFiles) {
    if (!isFileMatch(relPath, includes, negations)) continue;
    const srcPath = path.join(dev, relPath);
    const dstPath = path.join(prod, relPath);
    if (await shouldSkipFile(srcPath, dstPath, force)) {
      skipped++;
      if (verbose) console.log(`  SKIP    ${relPath} (unchanged)`);
      continue;
    }
    toCopy.push({ relPath, srcPath, dstPath });
  }

  const toDelete = [];
  if (mirror) {
    const prodFiles = await walkTree(prod, SAFETY_NEGATIONS);
    const allowedSet = new Set();
    for (const relPath of devFiles) {
      if (isFileMatch(relPath, includes, negations)) allowedSet.add(relPath);
    }
    for (const relPath of prodFiles) {
      if (!allowedSet.has(relPath)) {
        toDelete.push(path.join(prod, relPath));
        if (verbose || dryRun) console.log(`  ${dryRun ? 'WOULD DELETE' : 'DELETE'} ${relPath}`);
      }
    }
  }

  if (verbose || dryRun) {
    for (const { relPath } of toCopy) {
      console.log(`  ${dryRun ? 'WOULD COPY' : 'COPY'}   ${relPath}`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] sync_repo dev2prod`);
    console.log(`  Would copy:   ${toCopy.length} files`);
    console.log(`  Skipped:      ${skipped} files (unchanged)`);
    console.log(`  Would delete: ${toDelete.length} files`);
    return 0;
  }

  let errors = 0;
  for (const { relPath, srcPath, dstPath } of toCopy) {
    try {
      await fs.ensureDir(path.dirname(dstPath));
      await fs.copy(srcPath, dstPath, { preserveTimestamps: true });
    } catch (err) {
      console.error(`  ERROR copying ${relPath}: ${err.message}`);
      errors++;
    }
  }

  for (const fullPath of toDelete) {
    try {
      await fs.remove(fullPath);
    } catch (err) {
      console.error(`  ERROR deleting ${fullPath}: ${err.message}`);
      errors++;
    }
  }

  const prodrootPath = path.join(prod, '.prodroot');
  if (!(await fs.pathExists(prodrootPath))) {
    await fs.writeFile(prodrootPath, '');
  }

  console.log(`\nsync_repo dev2prod complete`);
  console.log(`  Copied:  ${toCopy.length} files`);
  console.log(`  Skipped: ${skipped} files (unchanged)`);
  console.log(`  Deleted: ${toDelete.length} files (mirror)`);
  console.log(`  Errors:  ${errors}`);

  return errors > 0 ? 2 : 0;
}

module.exports = { dev2prod };
